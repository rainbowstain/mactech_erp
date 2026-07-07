import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { query } from "@/lib/db";

// Estados que se pueden cambiar directo desde la tabla de ordenes.
// Garantia (4) se gestiona con su boton propio y Entregado (5) exige el
// cierre en revision (repuestos, metodo de pago, venta en finanzas).
const QUICK_STATES = [1, 2, 3];

function asPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

export async function PATCH(request, { params }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const orderId = asPositiveInt(Number(id));
  if (!orderId) return NextResponse.json({ message: "Orden inválida." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const estado = asPositiveInt(body.estado);
  if (!QUICK_STATES.includes(estado)) {
    return NextResponse.json(
      { message: "Estado inválido. Garantía y Entregado se gestionan desde la orden (Ver)." },
      { status: 400 }
    );
  }

  try {
    const orderResult = await query("select id, estado from ordenes where id = $1 limit 1", [orderId]);
    const order = orderResult.rows[0];
    if (!order) return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
    if (!QUICK_STATES.includes(Number(order.estado))) {
      return NextResponse.json(
        { message: "Esta orden está en garantía o cerrada; su estado se cambia desde la orden (Ver)." },
        { status: 409 }
      );
    }
    if (Number(order.estado) === estado) {
      return NextResponse.json({ ok: true, id: orderId, estado });
    }

    await query("update ordenes set estado = $2 where id = $1", [orderId, estado]);
    // Queda registro en el historial de revisiones de la orden.
    await query(
      `insert into revisiones (orden_id, responsable, id_estado, observacion, created_at)
       values ($1, $2, $3, $4, now())`,
      [orderId, session.name || session.email, estado, "Cambio rápido de estado desde la tabla de órdenes."]
    );

    return NextResponse.json({ ok: true, id: orderId, estado });
  } catch (error) {
    console.error("quick estado change failed", error);
    return NextResponse.json({ message: error.message || "No se pudo cambiar el estado." }, { status: 500 });
  }
}
