import { query } from "@/lib/db";

const ORDER_SELECT = `
  select
    o.id,
    o.created_at,
    o.fecha_entrega,
    o.fecha_salida,
    o.tecnico,
    o.cliente_id,
    o.imei,
    o.metodopago,
    o.codigo,
    o.referencia_externa,
    o.id_equipo,
    o.id_dispositivo,
    o.estado_dispositivo,
    o.observacion,
    o.estado,
    o.total_recepcion,
    o.subtotal,
    o.iva,
    o.descuento,
    o.total,
    c.nombre as cliente_nombre,
    c.run as cliente_run,
    c.mail as cliente_mail,
    c.fono as cliente_fono,
    e.nombre as equipo_nombre,
    d.nombre as dispositivo_nombre,
    eo.nombre_estado as estado_nombre,
    ee.nombre as estado_dispositivo_nombre
  from ordenes o
  left join clientes c on c.id = o.cliente_id
  left join equipos e on e.id = o.id_equipo
  left join dispositivos d on d.id = o.id_dispositivo
  left join estados_ordenes eo on eo.id = o.estado
  left join estado_equipos ee on ee.id = o.estado_dispositivo
`;

export async function getDashboardStats() {
  const result = await query(`
    select
      count(*)::int as total,
      count(*) filter (where estado in (1, 2, 3))::int as activas,
      count(*) filter (where estado = 5)::int as cerradas,
      coalesce(sum(total), 0)::int as monto_total
    from ordenes
  `);
  return result.rows[0] || { total: 0, activas: 0, cerradas: 0, monto_total: 0 };
}

export async function getPendingDashboard() {
  const statsResult = await query(`
    select
      count(*)::int as total,
      count(*) filter (where estado = 1)::int as total_iniciadas,
      count(*) filter (where estado = 2)::int as total_revision,
      count(*) filter (where estado = 3)::int as total_retiro
    from ordenes
    where estado < 5
  `);

  const ordersResult = await query(`
    ${ORDER_SELECT}
    where o.estado < 5
    order by coalesce(o.created_at, o.fecha_entrega, now()) desc, o.id desc
  `);

  return {
    stats: statsResult.rows[0] || {
      total: 0,
      total_iniciadas: 0,
      total_revision: 0,
      total_retiro: 0,
    },
    orders: ordersResult.rows,
  };
}

export async function getOrders({ limit = 100, search = "" } = {}) {
  const cleanSearch = search.trim();
  const params = [];
  let where = "";

  if (cleanSearch) {
    params.push(`%${cleanSearch}%`);
    where = `
      where
        o.id::text ilike $1
        or c.nombre ilike $1
        or c.run ilike $1
        or d.nombre ilike $1
        or e.nombre ilike $1
        or o.codigo ilike $1
    `;
  }

  params.push(limit);
  const result = await query(
    `
      ${ORDER_SELECT}
      ${where}
      order by coalesce(o.created_at, o.fecha_entrega, now()) desc, o.id desc
      limit $${params.length}
    `,
    params
  );

  return result.rows;
}

export async function getReviewOrders({ id = "", run = "", nombre = "", limit = 100 } = {}) {
  const cleanId = String(id || "").trim();
  const cleanRun = String(run || "").trim();
  const cleanName = String(nombre || "").trim();
  const params = [];
  let where = "";

  if (cleanId) {
    const numberId = Number(cleanId);
    if (!Number.isInteger(numberId) || numberId < 1) return [];
    params.push(numberId);
    where = "where o.id = $1";
  } else if (cleanRun) {
    params.push(cleanRun.replace(/[^0-9kK]/g, "").toLowerCase());
    where = "where lower(regexp_replace(coalesce(c.run, ''), '[^0-9kK]', '', 'g')) = $1";
  } else if (cleanName) {
    params.push(`%${cleanName}%`);
    where = "where c.nombre ilike $1";
  } else {
    return [];
  }

  params.push(limit);
  const result = await query(
    `
      ${ORDER_SELECT}
      ${where}
      order by coalesce(o.created_at, o.fecha_entrega, now()) desc, o.id desc
      limit $${params.length}
    `,
    params
  );

  return result.rows;
}

export async function getClosedOrders({ limit = 200, search = "" } = {}) {
  const cleanSearch = search.trim();
  const params = [];
  let where = "where o.estado = 5";

  if (cleanSearch) {
    params.push(`%${cleanSearch}%`);
    where += `
      and (
        o.id::text ilike $1
        or c.nombre ilike $1
        or c.run ilike $1
        or d.nombre ilike $1
        or e.nombre ilike $1
        or o.codigo ilike $1
      )
    `;
  }

  params.push(limit);
  const result = await query(
    `
      ${ORDER_SELECT}
      ${where}
      order by coalesce(o.fecha_salida, o.fecha_entrega, o.created_at, now()) desc, o.id desc
      limit $${params.length}
    `,
    params
  );

  return result.rows;
}

export async function getOrder(id) {
  const orderResult = await query(`${ORDER_SELECT} where o.id = $1 limit 1`, [id]);
  const order = orderResult.rows[0];
  if (!order) return null;

  const [responses, revisions, services, parts] = await Promise.all([
    query(
      `
        select r.id, r.respuesta, r.check_resp, p.descripcion as pregunta
        from respuestas r
        left join preguntas p on p.id = r.pregunta_id
        where r.orden_id = $1
        order by r.id asc
      `,
      [id]
    ),
    query(
      `
        select r.id, r.responsable, r.observacion, r.created_at, eo.nombre_estado
        from revisiones r
        left join estados_ordenes eo on eo.id = r.id_estado
        where r.orden_id = $1
        order by r.created_at desc nulls last, r.id desc
      `,
      [id]
    ),
    query(
      `
        select ohs.id, ohs.servicio_id, ohs.responsable, ohs.created_at, s.nombre, s.precio
        from orden_has_servicios ohs
        left join servicios s on s.id = ohs.servicio_id
        where ohs.orden_id = $1
        order by ohs.created_at desc nulls last, ohs.id desc
      `,
      [id]
    ),
    query(
      `
        select
          ore.id,
          ore.inventario_item_id,
          ore.cantidad,
          ore.costo_unitario,
          ore.precio_unitario,
          ore.total_costo,
          ore.total_venta,
          ii.producto,
          ii.marca,
          ii.codigo_barra
        from orden_repuestos ore
        left join inventario_items ii on ii.id = ore.inventario_item_id
        where ore.orden_id = $1
        order by ore.id asc
      `,
      [id]
    ),
  ]);

  return {
    ...order,
    responses: responses.rows,
    revisions: revisions.rows,
    services: services.rows,
    repuestos: parts.rows,
  };
}
