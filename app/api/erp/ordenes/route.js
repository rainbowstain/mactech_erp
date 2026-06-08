import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { transaction } from "@/lib/db";

function normalizeRun(value) {
  return String(value || "").replace(/[^0-9kK]/g, "").toLowerCase();
}

function asNullableText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function asNullableInt(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function asTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validate(body) {
  const client = body.client || {};
  const order = body.order || {};

  if (!normalizeRun(client.run)) return "Debe ingresar un RUN valido.";
  if (!asNullableText(client.nombre)) return "Debe ingresar el nombre del cliente.";
  if (!asNullableText(client.fono)) return "Debe ingresar el contacto del cliente.";
  if (!asNullableInt(order.id_equipo)) return "Debe seleccionar el equipo.";
  if (!asNullableInt(order.id_dispositivo)) return "Debe seleccionar el modelo.";
  if (!asNullableInt(order.estado_dispositivo)) return "Debe seleccionar el estado del equipo.";

  return null;
}

export async function POST(request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const validationMessage = validate(body);
  if (validationMessage) {
    return NextResponse.json({ message: validationMessage }, { status: 400 });
  }

  const clientPayload = body.client || {};
  const orderPayload = body.order || {};
  const answersPayload = Array.isArray(body.answers) ? body.answers : [];
  const normalizedRun = normalizeRun(clientPayload.run);

  try {
    const result = await transaction(async (db) => {
      const existingClient = await db.query(
        `
          select id
          from clientes
          where lower(regexp_replace(coalesce(run, ''), '[^0-9kK]', '', 'g')) = $1
          order by id asc
          limit 1
        `,
        [normalizedRun]
      );

      let clientId = existingClient.rows[0]?.id;

      if (clientId) {
        await db.query(
          `
            update clientes
            set nombre = $1, mail = $2, fono = $3, run = $4, estado = coalesce(estado, 1)
            where id = $5
          `,
          [
            asNullableText(clientPayload.nombre),
            asNullableText(clientPayload.mail),
            asNullableText(clientPayload.fono),
            asNullableText(clientPayload.run),
            clientId,
          ]
        );
      } else {
        const insertedClient = await db.query(
          `
            insert into clientes (nombre, run, mail, fono, estado)
            values ($1, $2, $3, $4, 1)
            returning id
          `,
          [
            asNullableText(clientPayload.nombre),
            asNullableText(clientPayload.run),
            asNullableText(clientPayload.mail),
            asNullableText(clientPayload.fono),
          ]
        );
        clientId = insertedClient.rows[0].id;
      }

      const insertedOrder = await db.query(
        `
          insert into ordenes (
            fecha_entrega,
            tecnico,
            cliente_id,
            imei,
            codigo,
            id_equipo,
            id_dispositivo,
            estado_dispositivo,
            observacion,
            estado,
            total_recepcion,
            subtotal,
            iva,
            descuento,
            total,
            created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1, $10, 0, 0, 0, 0, $11)
          returning id
        `,
        [
          asTimestamp(orderPayload.fecha_entrega),
          session.name || session.email,
          clientId,
          asNullableText(orderPayload.imei),
          asNullableText(orderPayload.codigo),
          asNullableInt(orderPayload.id_equipo),
          asNullableInt(orderPayload.id_dispositivo),
          asNullableInt(orderPayload.estado_dispositivo),
          asNullableText(orderPayload.observacion),
          asNullableInt(orderPayload.total_recepcion) || 0,
          asTimestamp(orderPayload.created_at) || new Date(),
        ]
      );

      const orderId = insertedOrder.rows[0].id;
      const answers = answersPayload
        .map((answer) => ({
          pregunta_id: asNullableInt(answer.pregunta_id),
          respuesta: asNullableText(answer.respuesta),
          check_resp: Boolean(answer.check_resp),
        }))
        .filter((answer) => answer.pregunta_id);

      for (const answer of answers) {
        await db.query(
          `
            insert into respuestas (pregunta_id, respuesta, orden_id, check_resp)
            values ($1, $2, $3, $4)
          `,
          [answer.pregunta_id, answer.respuesta, orderId, answer.check_resp]
        );
      }

      return { orderId, clientId };
    });

    return NextResponse.json({ id: result.orderId, client_id: result.clientId }, { status: 201 });
  } catch (error) {
    console.error("create order failed", error);
    return NextResponse.json({ message: "No se pudo guardar la orden." }, { status: 500 });
  }
}
