import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { query } from "@/lib/db";

function asText(value) {
  return String(value || "").trim();
}

function asInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function asPercent(value, fallback = 0) {
  const number = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(number) ? number : fallback;
}

function asId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function POST(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const desde = asInt(body.desde);
  const porcentajeEduardo = asPercent(body.porcentaje_eduardo);
  const porcentajeTienda = body.porcentaje_tienda === "" || body.porcentaje_tienda === undefined
    ? 1 - porcentajeEduardo
    : asPercent(body.porcentaje_tienda, 1 - porcentajeEduardo);

  const result = await query(
    `
      insert into finanzas_tramos (desde, porcentaje_eduardo, porcentaje_tienda, descripcion, estado)
      values ($1, $2, $3, $4, 1)
      returning *
    `,
    [desde, porcentajeEduardo, porcentajeTienda, asText(body.descripcion) || null]
  );
  return NextResponse.json(result.rows[0]);
}

export async function DELETE(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = asId(searchParams.get("id"));
  if (!id) return NextResponse.json({ message: "ID invalido." }, { status: 400 });

  const result = await query("update finanzas_tramos set estado = 0 where id = $1 returning *", [id]);
  if (!result.rows[0]) return NextResponse.json({ message: "Tramo no encontrado." }, { status: 404 });
  return NextResponse.json(result.rows[0]);
}
