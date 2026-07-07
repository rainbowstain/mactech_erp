import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { transaction } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { formatRut } from "@/lib/rut";

// Corrige datos de intake (cliente + orden) desde la revision de la OT.
// Sirve para arreglar errores de tipeo del ingreso (nombre, RUT, IMEI,
// marca/modelo, etc). Queda un registro en el historial con el valor
// antiguo y el nuevo (es_interno = true: no sale en la OT impresa).

function asPositiveInt(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function asNullableText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function asTimestamp(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameText(a, b) {
  return (a ?? "") === (b ?? "");
}

function sameDate(a, b) {
  const ta = a ? new Date(a).getTime() : null;
  const tb = b ? new Date(b).getTime() : null;
  return ta === tb;
}

function diffLine(label, oldValue, newValue) {
  return `${label}: "${oldValue || "-"}" → "${newValue || "-"}"`;
}

export async function PATCH(request, { params }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });

  const { id } = await params;
  const orderId = asPositiveInt(Number(id));
  if (!orderId) return NextResponse.json({ message: "Orden inválida." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const clientePayload = body.cliente || {};
  const ordenPayload = body.orden || {};

  const nextCliente = {
    nombre: asNullableText(clientePayload.nombre),
    run: formatRut(clientePayload.run) || null,
    mail: asNullableText(clientePayload.mail),
    fono: asNullableText(clientePayload.fono),
  };
  const nextOrden = {
    imei: asNullableText(ordenPayload.imei),
    codigo: asNullableText(ordenPayload.codigo),
    fecha_entrega: asTimestamp(ordenPayload.fecha_entrega),
    tecnico: asNullableText(ordenPayload.tecnico),
    id_equipo: asPositiveInt(ordenPayload.id_equipo),
    id_dispositivo: asPositiveInt(ordenPayload.id_dispositivo),
  };

  try {
    const result = await transaction(async (db) => {
      const orderResult = await db.query(
        `
          select o.id, o.imei, o.codigo, o.fecha_entrega, o.tecnico, o.id_equipo, o.id_dispositivo, o.cliente_id,
                 e.nombre as equipo_nombre, d.nombre as dispositivo_nombre
          from ordenes o
          left join equipos e on e.id = o.id_equipo
          left join dispositivos d on d.id = o.id_dispositivo
          where o.id = $1
          limit 1
        `,
        [orderId]
      );
      const currentOrder = orderResult.rows[0];
      if (!currentOrder) return { missing: true };

      const clienteResult = currentOrder.cliente_id
        ? await db.query("select id, nombre, run, mail, fono from clientes where id = $1 limit 1", [currentOrder.cliente_id])
        : { rows: [] };
      const currentCliente = clienteResult.rows[0] || null;

      const changes = [];

      if (currentCliente) {
        if (!sameText(currentCliente.nombre, nextCliente.nombre)) changes.push(diffLine("Nombre", currentCliente.nombre, nextCliente.nombre));
        if (!sameText(currentCliente.run, nextCliente.run)) changes.push(diffLine("RUT", currentCliente.run, nextCliente.run));
        if (!sameText(currentCliente.mail, nextCliente.mail)) changes.push(diffLine("Mail", currentCliente.mail, nextCliente.mail));
        if (!sameText(currentCliente.fono, nextCliente.fono)) changes.push(diffLine("Teléfono", currentCliente.fono, nextCliente.fono));
      }

      if (!sameText(currentOrder.imei, nextOrden.imei)) changes.push(diffLine("IMEI", currentOrder.imei, nextOrden.imei));
      if (!sameText(currentOrder.codigo, nextOrden.codigo)) changes.push(diffLine("Código", currentOrder.codigo, nextOrden.codigo));
      if (!sameText(currentOrder.tecnico, nextOrden.tecnico)) changes.push(diffLine("Técnico", currentOrder.tecnico, nextOrden.tecnico));
      if (!sameDate(currentOrder.fecha_entrega, nextOrden.fecha_entrega)) {
        changes.push(diffLine("Fecha entrega", formatDate(currentOrder.fecha_entrega), formatDate(nextOrden.fecha_entrega)));
      }

      let nextEquipoNombre = currentOrder.equipo_nombre;
      if (Number(currentOrder.id_equipo) !== Number(nextOrden.id_equipo)) {
        const equipoResult = nextOrden.id_equipo
          ? await db.query("select nombre from equipos where id = $1", [nextOrden.id_equipo])
          : { rows: [] };
        nextEquipoNombre = equipoResult.rows[0]?.nombre || null;
        changes.push(diffLine("Marca", currentOrder.equipo_nombre, nextEquipoNombre));
      }

      let nextDispositivoNombre = currentOrder.dispositivo_nombre;
      if (Number(currentOrder.id_dispositivo) !== Number(nextOrden.id_dispositivo)) {
        const dispositivoResult = nextOrden.id_dispositivo
          ? await db.query("select nombre from dispositivos where id = $1", [nextOrden.id_dispositivo])
          : { rows: [] };
        nextDispositivoNombre = dispositivoResult.rows[0]?.nombre || null;
        changes.push(diffLine("Modelo", currentOrder.dispositivo_nombre, nextDispositivoNombre));
      }

      if (!changes.length) return { noChanges: true };

      if (currentCliente) {
        await db.query("update clientes set nombre = $1, run = $2, mail = $3, fono = $4 where id = $5", [
          nextCliente.nombre,
          nextCliente.run,
          nextCliente.mail,
          nextCliente.fono,
          currentCliente.id,
        ]);
      }

      await db.query(
        `
          update ordenes
          set imei = $1, codigo = $2, fecha_entrega = $3, tecnico = $4, id_equipo = $5, id_dispositivo = $6
          where id = $7
        `,
        [nextOrden.imei, nextOrden.codigo, nextOrden.fecha_entrega, nextOrden.tecnico, nextOrden.id_equipo, nextOrden.id_dispositivo, orderId]
      );

      await db.query(
        `
          insert into revisiones (orden_id, responsable, id_estado, observacion, es_interno, created_at)
          values ($1, $2, null, $3, true, now())
        `,
        [orderId, session.name || session.email, `Corrección de datos — ${changes.join("; ")}`]
      );

      return { ok: true };
    });

    if (result.missing) return NextResponse.json({ message: "Orden no encontrada." }, { status: 404 });
    if (result.noChanges) return NextResponse.json({ message: "No hay cambios que guardar." }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("save order data correction failed", error);
    return NextResponse.json({ message: error.message || "No se pudo guardar la corrección." }, { status: 500 });
  }
}
