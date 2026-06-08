import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { transaction } from "@/lib/db";

function asPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function POST(_request, { params }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const orderId = asPositiveInt(id);
  if (!orderId) return NextResponse.json({ message: "Orden invalida." }, { status: 400 });

  try {
    const result = await transaction(async (db) => {
      const orderResult = await db.query("select * from ordenes where id = $1 for update", [orderId]);
      const order = orderResult.rows[0];
      if (!order) return { missing: true };
      if (Number(order.estado) === 4) return { id: orderId, alreadyWarranty: true };
      if (Number(order.estado) !== 5) return { invalidState: true };

      const warrantyResult = await db.query(
        `
          insert into garantias (orden_id, fecha, subtotal, iva, descuento, total)
          values ($1, now(), $2, $3, $4, $5)
          returning id
        `,
        [orderId, order.subtotal || 0, order.iva || 0, order.descuento || 0, order.total || 0]
      );
      const warrantyId = warrantyResult.rows[0].id;

      await db.query(
        `
          update ordenes
          set estado = 4, id_ultima_garantia = $2
          where id = $1
        `,
        [orderId, warrantyId]
      );

      await db.query(
        `
          insert into revisiones (orden_id, responsable, id_estado, observacion, garantia_id, created_at)
          values ($1, $2, 4, $3, $4, now())
        `,
        [orderId, session.name || session.email, "Garantia activada por retorno de cliente.", warrantyId]
      );

      return { id: orderId, warrantyId };
    });

    if (result.missing) return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
    if (result.invalidState) return NextResponse.json({ message: "Solo se puede activar garantia desde una orden cerrada." }, { status: 400 });
    return NextResponse.json(result);
  } catch (error) {
    console.error("activate warranty failed", error);
    return NextResponse.json({ message: "No se pudo activar garantia." }, { status: 500 });
  }
}
