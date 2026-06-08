import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { query } from "@/lib/db";

function normalizeRun(value) {
  return String(value || "").replace(/[^0-9kK]/g, "").toLowerCase();
}

export async function GET(request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const run = String(searchParams.get("run") || "").trim();
  const normalizedRun = normalizeRun(run);

  if (!normalizedRun) {
    return NextResponse.json({ message: "Debe ingresar un RUN valido." }, { status: 400 });
  }

  const result = await query(
    `
      select id, nombre, run, mail, fono, estado
      from clientes
      where lower(regexp_replace(coalesce(run, ''), '[^0-9kK]', '', 'g')) = $1
      limit 1
    `,
    [normalizedRun]
  );

  const client = result.rows[0] || null;
  if (!client) {
    return NextResponse.json({ client: null, message: "Cliente no registrado. Puedes ingresarlo como nuevo." });
  }

  return NextResponse.json({ client });
}
