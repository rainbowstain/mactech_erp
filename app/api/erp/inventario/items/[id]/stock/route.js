import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { moveInventoryStock } from "@/lib/inventory";

function asId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function POST(request, { params }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = asId(rawId);
  if (!id) return NextResponse.json({ message: "ID invalido." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const tipo = ["entrada", "salida", "ajuste"].includes(body.tipo) ? body.tipo : "entrada";
  const cantidad = Number(body.cantidad || 0);
  if (!Number.isFinite(cantidad) || cantidad < 0) {
    return NextResponse.json({ message: "Cantidad invalida." }, { status: 400 });
  }

  const item = await moveInventoryStock(id, {
    tipo,
    cantidad,
    motivo: body.motivo,
    costo_unitario: body.costo_unitario,
    responsable: session.name || session.email,
  });

  if (!item) return NextResponse.json({ message: "Producto no encontrado." }, { status: 404 });
  return NextResponse.json(item);
}
