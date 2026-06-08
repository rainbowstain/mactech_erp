import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { createProductSale } from "@/lib/finance";

export async function POST(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ message: "Agregue al menos un producto." }, { status: 400 });
  }

  try {
    const sale = await createProductSale({
      items,
      metodo_pago: body.metodo_pago,
      notas: body.notas,
      responsable: session.name || session.email,
    });
    return NextResponse.json(sale);
  } catch (error) {
    return NextResponse.json({ message: error.message || "No se pudo registrar la venta." }, { status: 400 });
  }
}
