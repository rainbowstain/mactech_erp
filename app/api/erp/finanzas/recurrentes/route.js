import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { normalizeExpenseType } from "@/lib/finance";

function asText(value) {
  return String(value || "").trim();
}

function asInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function asId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const categoria = asText(body.categoria);
  const monto = asInt(body.monto);
  if (!categoria || monto <= 0) {
    return NextResponse.json({ message: "Ingrese categoria y monto." }, { status: 400 });
  }

  const result = await query(
    `
      insert into finanzas_gastos_recurrentes (categoria, descripcion, monto, tipo, dia, estado)
      values ($1, $2, $3, $4, $5, 1)
      returning *
    `,
    [categoria, asText(body.descripcion) || null, monto, normalizeExpenseType(body.tipo), Math.min(31, Math.max(1, asInt(body.dia, 1)))]
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = asId(searchParams.get("id"));
  if (!id) return NextResponse.json({ message: "ID invalido." }, { status: 400 });

  const result = await query("update finanzas_gastos_recurrentes set estado = 0 where id = $1 returning *", [id]);
  if (!result.rows[0]) return NextResponse.json({ message: "Gasto recurrente no encontrado." }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}
