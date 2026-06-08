import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { query } from "@/lib/db";

const RESOURCES = {
  clientes: {
    table: "clientes",
    fields: ["nombre", "run", "mail", "fono", "estado"],
    required: ["nombre"],
  },
  equipos: {
    table: "equipos",
    fields: ["nombre", "estado"],
    required: ["nombre"],
  },
  dispositivos: {
    table: "dispositivos",
    fields: ["nombre", "modelo", "estado"],
    required: ["nombre", "modelo"],
  },
  servicios: {
    table: "servicios",
    fields: ["nombre", "precio", "costo", "estado"],
    required: ["nombre"],
  },
  preguntas: {
    table: "preguntas",
    fields: ["descripcion", "estado"],
    required: ["descripcion"],
  },
};

function asText(value) {
  return String(value || "").trim();
}

function asNullableText(value) {
  const text = asText(value);
  return text || null;
}

function asInt(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function cleanPayload(config, body) {
  const payload = {};

  for (const field of config.fields) {
    if (field === "estado") payload[field] = asInt(body[field], 1) ? 1 : 0;
    else if (field === "precio" || field === "costo") payload[field] = asInt(body[field], 0);
    else if (field === "modelo") payload[field] = asInt(body[field], null);
    else payload[field] = asNullableText(body[field]);
  }

  return payload;
}

function validate(config, payload) {
  for (const field of config.required) {
    if (!payload[field]) return "Complete los campos obligatorios.";
  }
  return null;
}

export async function POST(request, { params }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { resource } = await params;
  const config = RESOURCES[resource];
  if (!config) {
    return NextResponse.json({ message: "Mantenedor invalido." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const payload = cleanPayload(config, body);
  const validation = validate(config, payload);
  if (validation) {
    return NextResponse.json({ message: validation }, { status: 400 });
  }

  const columns = config.fields;
  const placeholders = columns.map((_, index) => `$${index + 1}`);
  const values = columns.map((field) => payload[field]);

  const result = await query(
    `
      insert into ${config.table} (${columns.join(", ")})
      values (${placeholders.join(", ")})
      returning *
    `,
    values
  );

  return NextResponse.json(result.rows[0]);
}
