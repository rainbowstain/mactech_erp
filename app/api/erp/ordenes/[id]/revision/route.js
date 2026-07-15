import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { materializeOrderSale } from "@/lib/finance";

function asText(value) {
  return String(value || "").trim();
}

function asNullableText(value) {
  const text = asText(value);
  return text || null;
}

function asInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function asPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function calcTotals({ serviceTotal, descuento, fallbackTotal = 0 }) {
  const baseTotal = asInt(serviceTotal) > 0 ? asInt(serviceTotal) : asInt(fallbackTotal);
  const gross = Math.max(0, baseTotal - asInt(descuento));
  const net = Math.round(gross / 1.19);
  return {
    subtotal: net,
    iva: gross - net,
    descuento: asInt(descuento),
    total: gross,
  };
}

export async function POST(request, { params }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const orderId = asPositiveInt(Number(id));
  if (!orderId) {
    return NextResponse.json({ message: "Orden invalida." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action === "close" ? "close" : "save";
  const estado = asPositiveInt(body.estado) || 2;
  // La nota de cierre ya viene pre-escrita y editable desde el formulario.
  // Solo guardamos lo que el usuario deja escrito (puede borrarla).
  const observacion = asNullableText(body.observacion);
  const repuestos = Array.isArray(body.repuestos) ? body.repuestos : [];
  const metodopago = asNullableText(body.metodopago);

  if (action === "close" && !metodopago) {
    return NextResponse.json({ message: "Seleccione un metodo de pago." }, { status: 400 });
  }

  try {
    const result = await transaction(async (db) => {
      const orderResult = await db.query(
        "select id, estado, id_ultima_garantia, total_recepcion from ordenes where id = $1 limit 1",
        [orderId]
      );
      const order = orderResult.rows[0];
      if (!order) {
        return { missing: true };
      }
      if (Number(order.estado) >= 5) {
        return { closed: true };
      }
      const totals = calcTotals({
        serviceTotal: body.serviceTotal,
        descuento: body.descuento,
        fallbackTotal: order.total_recepcion,
      });
      const warrantyId = Number(order.estado) === 4 ? order.id_ultima_garantia || null : null;

      if (observacion) {
        await db.query(
          `
            insert into revisiones (orden_id, responsable, id_estado, observacion, garantia_id, created_at)
            values ($1, $2, $3, $4, $5, now())
          `,
          [orderId, session.name || session.email, action === "close" ? 5 : estado, observacion, warrantyId]
        );
      }

      await db.query("alter table ordenes add column if not exists abono integer default 0");
      await db.query("alter table inventario_items add column if not exists ultimo_precio_venta integer");
      await db.query("alter table inventario_items add column if not exists ultimo_precio_fecha timestamptz");
      await db.query("alter table inventario_items add column if not exists ultima_orden_id integer");

      await db.query("delete from orden_repuestos where orden_id = $1", [orderId]);
      for (const part of repuestos) {
        const itemId = asPositiveInt(part.inventario_item_id);
        const quantity = Math.max(1, asInt(part.cantidad, 1));
        if (!itemId) continue;

        const itemResult = await db.query("select * from inventario_items where id = $1 and area = 'taller' for update", [itemId]);
        const item = itemResult.rows[0];
        if (!item) continue;

        const unitCost = asInt(part.costo_unitario, item.valor_original || 0);
        const unitPrice = asInt(part.precio_unitario, item.ultimo_precio_venta ?? item.valor_venta ?? 0);

        // No bloqueamos por falta de stock: el inventario aun no esta contado.
        // La rebaja queda registrada (el stock puede quedar negativo) y ademas
        // se anota en inventario_movimientos para conciliarlo cuando se cuente.

        await db.query(
          `
            insert into orden_repuestos (
              orden_id, inventario_item_id, cantidad, costo_unitario, precio_unitario,
              total_costo, total_venta, responsable
            )
            values ($1, $2, $3, $4, $5, $6, $7, $8)
          `,
          [
            orderId,
            itemId,
            quantity,
            unitCost,
            unitPrice,
            unitCost * quantity,
            unitPrice * quantity,
            session.name || session.email,
          ]
        );

        // Guardar el ultimo valor cobrado en el repuesto del inventario.
        if (unitPrice > 0) {
          await db.query(
            `
              update inventario_items
              set ultimo_precio_venta = $1, ultimo_precio_fecha = now(), ultima_orden_id = $2, updated_at = now()
              where id = $3
            `,
            [unitPrice, orderId, itemId]
          );
        }

        // Los items generales (ex-servicios: diagnostico, reparacion placa, etc.) no
        // tienen stock fisico; no se descuentan ni generan movimiento de inventario.
        if (action === "close" && !item.es_general) {
          const previous = Number(item.cantidad || 0);
          const next = previous - quantity; // permitimos negativo: marca el faltante por contar
          await db.query("update inventario_items set cantidad = $1, updated_at = now() where id = $2", [next, itemId]);
          await db.query(
            `
              insert into inventario_movimientos (
                item_id, tipo, cantidad, cantidad_anterior, cantidad_nueva, costo_unitario, total_costo,
                referencia_tipo, referencia_id, motivo, responsable
              )
              values ($1, 'salida', $2, $3, $4, $5, $6, 'ot', $7, $8, $9)
            `,
            [
              itemId,
              quantity,
              previous,
              next,
              unitCost,
              unitCost * quantity,
              orderId,
              `Repuesto OT ${orderId}`,
              session.name || session.email,
            ]
          );
        }
      }

      await db.query(
        `
          update ordenes
          set
            estado = $2,
            metodopago = coalesce($3, metodopago),
            subtotal = $4,
            iva = $5,
            descuento = $6,
            total = $7,
            abono = $8,
            fecha_entrega = case when $2 = 5 then coalesce(fecha_entrega, now()) else fecha_entrega end,
            fecha_salida = case when $2 = 5 then now() else fecha_salida end
          where id = $1
        `,
        [
          orderId,
          action === "close" ? 5 : estado,
          metodopago,
          totals.subtotal,
          totals.iva,
          totals.descuento,
          totals.total,
          asInt(body.abono, 0),
        ]
      );

      if (action === "close") {
        await materializeOrderSale(db, orderId, session.name || session.email);
      }

      return { id: orderId, estado: action === "close" ? 5 : estado };
    });

    if (result.missing) {
      return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
    }
    if (result.closed) {
      return NextResponse.json({ message: "La orden ya esta cerrada y no puede modificarse desde revision." }, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("save revision failed", error);
    return NextResponse.json({ message: error.message || "No se pudo guardar la revision." }, { status: 500 });
  }
}
