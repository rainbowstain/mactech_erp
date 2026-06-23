import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { canDeleteOrders } from "@/lib/users";
import { materializeOrderSale } from "@/lib/finance";

function asInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function asPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

// Eliminar una OT (solo admin/developer). Las hijas con FK cascade se borran
// solas; quitamos también su venta de OT para que no quede en finanzas.
export async function DELETE(request, { params }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!canDeleteOrders(session)) {
    return NextResponse.json({ message: "Solo admin o developer pueden eliminar órdenes." }, { status: 403 });
  }

  const { id } = await params;
  const orderId = asPositiveInt(Number(id));
  if (!orderId) return NextResponse.json({ message: "Orden inválida." }, { status: 400 });

  try {
    const result = await transaction(async (db) => {
      const exists = await db.query("select id from ordenes where id = $1 limit 1", [orderId]);
      if (!exists.rows[0]) return { missing: true };
      await db.query(
        "delete from venta_items where venta_id in (select id from ventas where orden_id = $1 and tipo = 'ot')",
        [orderId]
      );
      await db.query("delete from ventas where orden_id = $1 and tipo = 'ot'", [orderId]);
      await db.query("delete from ordenes where id = $1", [orderId]);
      return { id: orderId };
    });
    if (result.missing) return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("delete order failed", error);
    return NextResponse.json({ message: error.message || "No se pudo eliminar la orden." }, { status: 500 });
  }
}

// Ajustar costo/precio de repuestos de una OT (incluso cerrada) para corregir
// finanzas. Actualiza orden_repuestos, opcionalmente el inventario de taller, y
// re-materializa la venta para que ganancias/pérdidas queden correctas.
export async function PATCH(request, { params }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!canDeleteOrders(session)) {
    return NextResponse.json({ message: "Solo admin o developer pueden ajustar costos." }, { status: 403 });
  }

  const { id } = await params;
  const orderId = asPositiveInt(Number(id));
  if (!orderId) return NextResponse.json({ message: "Orden inválida." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const edits = Array.isArray(body.repuestos) ? body.repuestos : [];
  const syncInventory = body.syncInventory !== false; // por defecto sí
  if (!edits.length) return NextResponse.json({ message: "Sin cambios." }, { status: 400 });

  try {
    const result = await transaction(async (db) => {
      const order = (await db.query("select id, descuento from ordenes where id = $1 limit 1", [orderId])).rows[0];
      if (!order) return { missing: true };

      for (const edit of edits) {
        const lineId = asPositiveInt(edit.id);
        if (!lineId) continue;
        const line = (
          await db.query("select id, inventario_item_id, cantidad, costo_unitario, precio_unitario from orden_repuestos where id = $1 and orden_id = $2 limit 1", [lineId, orderId])
        ).rows[0];
        if (!line) continue;

        const cantidad = Math.max(1, asInt(line.cantidad, 1));
        const costo = edit.costo_unitario != null ? asInt(edit.costo_unitario) : asInt(line.costo_unitario);
        const precio = edit.precio_unitario != null ? asInt(edit.precio_unitario) : asInt(line.precio_unitario);

        await db.query(
          "update orden_repuestos set costo_unitario = $1, precio_unitario = $2, total_costo = $3, total_venta = $4 where id = $5",
          [costo, precio, costo * cantidad, precio * cantidad, lineId]
        );

        if (syncInventory && line.inventario_item_id) {
          await db.query(
            "update inventario_items set valor_original = $1, ultimo_precio_venta = $2, ultimo_precio_fecha = now(), updated_at = now() where id = $3",
            [costo, precio, line.inventario_item_id]
          );
        }
      }

      // Recalcula totales de la orden con los nuevos precios.
      const sums = (
        await db.query(
          `select
             coalesce((select sum(total_venta) from orden_repuestos where orden_id = $1), 0)::int as parts_venta,
             coalesce((select sum(s.precio) from orden_has_servicios ohs join servicios s on s.id = ohs.servicio_id where ohs.orden_id = $1), 0)::int as services_precio`,
          [orderId]
        )
      ).rows[0];
      const gross = Math.max(0, asInt(sums.parts_venta) + asInt(sums.services_precio) - asInt(order.descuento));
      const net = gross > 0 ? Math.round(gross / 1.19) : 0;
      await db.query("update ordenes set subtotal = $1, iva = $2, total = $3 where id = $4", [net, gross - net, gross, orderId]);

      // Re-materializa la venta (si la orden está cerrada) para finanzas.
      await materializeOrderSale(db, orderId, session.name || session.email);

      return { id: orderId };
    });

    if (result.missing) return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    console.error("patch order costs failed", error);
    return NextResponse.json({ message: error.message || "No se pudieron ajustar los costos." }, { status: 500 });
  }
}
