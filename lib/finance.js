import { query, transaction } from "@/lib/db";

export const PAYMENT_METHODS = ["EFECTIVO", "TRANSFERENCIA", "DEBITO", "CREDITO", "REDBANK", "OTRO"];
export const EXPENSE_TYPES = ["operativo", "publicidad", "compra", "otro"];

export function normalizePaymentMethod(value) {
  const method = String(value || "").trim().toUpperCase();
  return PAYMENT_METHODS.includes(method) ? method : "OTRO";
}

export function normalizeExpenseType(value) {
  const type = String(value || "").trim().toLowerCase();
  return EXPENSE_TYPES.includes(type) ? type : "operativo";
}

export function monthRange({ year, month }) {
  const cleanYear = Number.isInteger(Number(year)) ? Number(year) : new Date().getFullYear();
  const cleanMonth = Number.isInteger(Number(month)) ? Number(month) : new Date().getMonth() + 1;
  const start = `${cleanYear}-${String(cleanMonth).padStart(2, "0")}-01`;
  const nextMonth = cleanMonth === 12 ? 1 : cleanMonth + 1;
  const nextYear = cleanMonth === 12 ? cleanYear + 1 : cleanYear;
  const end = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
  return { year: cleanYear, month: cleanMonth, start, end };
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

export function financeRange({ period = "month", year, month, date } = {}) {
  const mode = ["day", "week", "month", "year"].includes(period) ? period : "month";
  const monthBase = monthRange({ year, month });

  if (mode === "year") {
    return {
      year: monthBase.year,
      month: monthBase.month,
      period: mode,
      date: date || `${monthBase.year}-01-01`,
      start: `${monthBase.year}-01-01`,
      end: `${monthBase.year + 1}-01-01`,
    };
  }

  if (mode === "month") {
    return { ...monthBase, period: mode, date: date || monthBase.start };
  }

  const baseDate = date ? new Date(`${date}T00:00:00`) : new Date(`${monthBase.start}T00:00:00`);
  const safeDate = Number.isNaN(baseDate.getTime()) ? new Date(`${monthBase.start}T00:00:00`) : baseDate;

  if (mode === "day") {
    const endDate = new Date(safeDate);
    endDate.setDate(endDate.getDate() + 1);
    return {
      year: safeDate.getFullYear(),
      month: safeDate.getMonth() + 1,
      period: mode,
      date: isoDate(safeDate),
      start: isoDate(safeDate),
      end: isoDate(endDate),
    };
  }

  const startDate = new Date(safeDate);
  const day = startDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  startDate.setDate(startDate.getDate() + diff);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);

  return {
    year: safeDate.getFullYear(),
    month: safeDate.getMonth() + 1,
    period: mode,
    date: isoDate(safeDate),
    start: isoDate(startDate),
    end: isoDate(endDate),
  };
}

function asInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

async function getApplicableTranche(amount) {
  const result = await query(
    `
      select desde, porcentaje_eduardo, porcentaje_tienda, descripcion
      from finanzas_tramos
      where estado = 1 and desde <= $1
      order by desde desc
      limit 1
    `,
    [Math.max(0, asInt(amount))]
  );
  return result.rows[0] || { porcentaje_eduardo: 0, porcentaje_tienda: 1, descripcion: "Sin tramo" };
}

export async function getFinanceSummary({ year, month, period, date } = {}) {
  const range = financeRange({ year, month, period, date });
  const result = await query(
    `
      with ventas_periodo as (
        select
          coalesce(sum(total_bruto), 0)::int as ingresos,
          coalesce(sum(costo_directo), 0)::int as costos,
          coalesce(sum(total_bruto) filter (where tipo = 'producto'), 0)::int as ingresos_productos,
          coalesce(sum(total_bruto) filter (where tipo = 'ot'), 0)::int as ingresos_ot,
          coalesce(sum(total_bruto) filter (where tipo = 'historico'), 0)::int as ingresos_historicos,
          coalesce(sum(ingreso_liquido) filter (where tipo = 'historico'), 0)::int as liquido_historico,
          coalesce(sum(monto_tienda) filter (where tipo = 'historico'), 0)::int as tienda_historico,
          coalesce(sum(monto_eduardo) filter (where tipo = 'historico'), 0)::int as eduardo_historico
        from ventas
        where estado = 1 and fecha >= $1::date and fecha < $2::date
      ),
      gastos_periodo as (
        select
          coalesce(sum(monto) filter (where tipo = 'operativo'), 0)::int as gastos_operativos,
          coalesce(sum(monto) filter (where tipo = 'publicidad'), 0)::int as publicidad,
          coalesce(sum(monto) filter (where tipo = 'compra'), 0)::int as compras,
          coalesce(sum(monto) filter (where tipo not in ('operativo', 'publicidad', 'compra')), 0)::int as otros_gastos
        from finanzas_gastos
        where estado = 1 and fecha >= $1::date and fecha < $2::date
      )
      select *
      from ventas_periodo cross join gastos_periodo
    `,
    [range.start, range.end]
  );

  const row = result.rows[0] || {};
  const utilidadNeta =
    asInt(row.ingresos) -
    asInt(row.costos) -
    asInt(row.gastos_operativos) -
    asInt(row.publicidad) -
    asInt(row.otros_gastos);
  const utilidadHistorica = asInt(row.liquido_historico);
  const utilidadOperacional = utilidadNeta - utilidadHistorica;
  const tramo = await getApplicableTranche(utilidadOperacional);
  const porcentajeEduardo = Number(tramo.porcentaje_eduardo || 0);
  const porcentajeTienda = Number(tramo.porcentaje_tienda || 1);
  const montoEduardoOperacional = Math.round(Math.max(0, utilidadOperacional) * porcentajeEduardo);
  const montoTiendaOperacional = Math.round(Math.max(0, utilidadOperacional) * porcentajeTienda);
  const totalEduardo = asInt(row.eduardo_historico) + montoEduardoOperacional;
  const totalTienda = asInt(row.tienda_historico) + montoTiendaOperacional;
  const splitBase = Math.max(1, Math.max(0, utilidadNeta));

  return {
    ...range,
    ingresos: asInt(row.ingresos),
    ingresos_productos: asInt(row.ingresos_productos),
    ingresos_ot: asInt(row.ingresos_ot),
    ingresos_historicos: asInt(row.ingresos_historicos),
    liquido_historico: utilidadHistorica,
    tienda_historico: asInt(row.tienda_historico),
    eduardo_historico: asInt(row.eduardo_historico),
    costos: asInt(row.costos),
    gastos_operativos: asInt(row.gastos_operativos),
    publicidad: asInt(row.publicidad),
    compras: asInt(row.compras),
    otros_gastos: asInt(row.otros_gastos),
    utilidad_neta: utilidadNeta,
    utilidad_operacional: utilidadOperacional,
    porcentaje_eduardo: porcentajeEduardo,
    porcentaje_tienda: porcentajeTienda,
    monto_eduardo: totalEduardo,
    monto_tienda: totalTienda,
    monto_eduardo_operacional: montoEduardoOperacional,
    monto_tienda_operacional: montoTiendaOperacional,
    porcentaje_eduardo_promedio: utilidadNeta > 0 ? totalEduardo / splitBase : 0,
    porcentaje_tienda_promedio: utilidadNeta > 0 ? totalTienda / splitBase : 1,
    tramo_descripcion: tramo.descripcion,
  };
}

export async function getFinanceInsights({ year, month, period, date } = {}) {
  const range = financeRange({ year, month, period, date });
  const [salesResult, expensesResult, lowStockResult] = await Promise.all([
    query(
      `
        select tipo, count(*)::int as cantidad, coalesce(sum(total_bruto), 0)::int as total
        from ventas
        where estado = 1 and fecha >= $1::date and fecha < $2::date
        group by tipo
        order by total desc
      `,
      [range.start, range.end]
    ),
    query(
      `
        select tipo, categoria, coalesce(sum(monto), 0)::int as total
        from finanzas_gastos
        where estado = 1 and fecha >= $1::date and fecha < $2::date
        group by tipo, categoria
        order by total desc
        limit 8
      `,
      [range.start, range.end]
    ),
    query(
      `
        select area, producto, marca, cantidad, stock_minimo, valor_venta
        from inventario_items
        where estado = 1 and cantidad <= stock_minimo
        order by area asc, cantidad asc, producto asc
        limit 8
      `
    ),
  ]);

  return {
    salesMix: salesResult.rows,
    topExpenses: expensesResult.rows,
    lowStock: lowStockResult.rows,
  };
}

export async function getAnnualFinanceReport(year = new Date().getFullYear()) {
  const months = [];
  for (let month = 1; month <= 12; month += 1) {
    months.push(await getFinanceSummary({ year, month }));
  }
  return months;
}

export async function getFinanceDailyRows({ year, month, period, date } = {}) {
  const range = financeRange({ year, month, period, date });
  const result = await query(
    `
      with days as (
        select generate_series($1::date, ($2::date - interval '1 day')::date, interval '1 day')::date as fecha
      ),
      ventas_dia as (
        select
          fecha::date as fecha,
          coalesce(sum(total_bruto), 0)::int as ingresos,
          coalesce(sum(costo_directo), 0)::int as costos,
          coalesce(sum(total_bruto) filter (where tipo = 'ot'), 0)::int as ingresos_ot,
          coalesce(sum(total_bruto) filter (where tipo = 'producto'), 0)::int as ingresos_productos
        from ventas
        where estado = 1 and fecha >= $1::date and fecha < $2::date
        group by fecha::date
      ),
      gastos_dia as (
        select
          fecha::date as fecha,
          coalesce(sum(monto) filter (where tipo <> 'compra'), 0)::int as gastos
        from finanzas_gastos
        where estado = 1 and fecha >= $1::date and fecha < $2::date
        group by fecha::date
      )
      select
        days.fecha,
        coalesce(ventas_dia.ingresos, 0)::int as ingresos,
        coalesce(ventas_dia.costos, 0)::int as costos,
        coalesce(gastos_dia.gastos, 0)::int as gastos,
        (coalesce(ventas_dia.ingresos, 0) - coalesce(ventas_dia.costos, 0) - coalesce(gastos_dia.gastos, 0))::int as utilidad,
        coalesce(ventas_dia.ingresos_ot, 0)::int as ingresos_ot,
        coalesce(ventas_dia.ingresos_productos, 0)::int as ingresos_productos
      from days
      left join ventas_dia on ventas_dia.fecha = days.fecha
      left join gastos_dia on gastos_dia.fecha = days.fecha
      order by days.fecha desc
    `,
    [range.start, range.end]
  );

  return result.rows;
}

export async function getFinanceExpenses({ year, month } = {}) {
  const range = monthRange({ year, month });
  const result = await query(
    `
      select id, fecha, categoria, descripcion, monto, tipo, metodo_pago, estado
      from finanzas_gastos
      where fecha >= $1::date and fecha < $2::date
      order by fecha desc, id desc
    `,
    [range.start, range.end]
  );
  return result.rows;
}

export async function getRecurringExpenses() {
  const result = await query(
    `
      select id, categoria, descripcion, monto, tipo, dia, estado
      from finanzas_gastos_recurrentes
      order by estado desc, tipo asc, categoria asc
    `
  );
  return result.rows;
}

export async function getFinanceTranches() {
  const result = await query(
    `
      select id, desde, porcentaje_eduardo, porcentaje_tienda, descripcion, estado
      from finanzas_tramos
      order by desde asc
    `
  );
  return result.rows;
}

export async function getRecentSales(limit = 80) {
  const result = await query(
    `
      select id, tipo, orden_id, fecha, metodo_pago, total_bruto, costo_directo, notas, responsable
      from ventas
      where estado = 1
      order by fecha desc, id desc
      limit $1
    `,
    [limit]
  );
  return result.rows;
}

export async function getSaleReceipt(id) {
  const saleResult = await query(
    `
      select id, tipo, orden_id, fecha, metodo_pago, total_bruto, costo_directo, notas, responsable, estado, created_at
      from ventas
      where id = $1 and estado = 1
      limit 1
    `,
    [asInt(id)]
  );
  const sale = saleResult.rows[0];
  if (!sale) return null;

  const itemResult = await query(
    `
      select
        vi.id,
        vi.descripcion,
        vi.cantidad,
        vi.precio_unitario,
        vi.total,
        ii.producto,
        ii.marca,
        ii.codigo_barra
      from venta_items vi
      left join inventario_items ii on ii.id = vi.inventario_item_id
      where vi.venta_id = $1
      order by vi.id asc
    `,
    [sale.id]
  );

  return {
    ...sale,
    items: itemResult.rows,
  };
}

export async function createProductSale({ items, metodo_pago, notas, responsable }) {
  return transaction(async (db) => {
    const saleRows = [];
    let total = 0;
    let cost = 0;

    for (const raw of items) {
      const itemId = asInt(raw.inventario_item_id);
      const quantity = Math.max(1, asInt(raw.cantidad, 1));
      const itemResult = await db.query("select * from inventario_items where id = $1 and area = 'productos' for update", [
        itemId,
      ]);
      const item = itemResult.rows[0];
      if (!item) throw new Error("Producto no encontrado.");
      if (Number(item.cantidad || 0) < quantity) throw new Error(`Stock insuficiente: ${item.producto}`);

      const price = asInt(raw.precio_unitario, item.valor_venta || 0);
      const unitCost = asInt(item.valor_original || 0);
      const lineTotal = price * quantity;
      const lineCost = unitCost * quantity;
      saleRows.push({ item, quantity, price, unitCost, lineTotal, lineCost });
      total += lineTotal;
      cost += lineCost;
    }

    const saleResult = await db.query(
      `
        insert into ventas (tipo, fecha, metodo_pago, total_bruto, costo_directo, notas, responsable, estado)
        values ('producto', now(), $1, $2, $3, $4, $5, 1)
        returning *
      `,
      [normalizePaymentMethod(metodo_pago), total, cost, notas || null, responsable || null]
    );
    const sale = saleResult.rows[0];

    for (const row of saleRows) {
      const previous = Number(row.item.cantidad || 0);
      const next = previous - row.quantity;
      await db.query("update inventario_items set cantidad = $1, updated_at = now() where id = $2", [next, row.item.id]);
      await db.query(
        `
          insert into venta_items (
            venta_id, inventario_item_id, descripcion, cantidad, precio_unitario, costo_unitario, total, total_costo
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [sale.id, row.item.id, row.item.producto, row.quantity, row.price, row.unitCost, row.lineTotal, row.lineCost]
      );
      await db.query(
        `
          insert into inventario_movimientos (
            item_id, tipo, cantidad, cantidad_anterior, cantidad_nueva, costo_unitario, total_costo,
            referencia_tipo, referencia_id, motivo, responsable
          )
          values ($1, 'salida', $2, $3, $4, $5, $6, 'venta', $7, 'Venta de producto', $8)
        `,
        [row.item.id, row.quantity, previous, next, row.unitCost, row.lineCost, sale.id, responsable || null]
      );
    }

    return sale;
  });
}

export async function materializeOrderSale(db, orderId, responsable) {
  const orderResult = await db.query("select * from ordenes where id = $1 limit 1", [orderId]);
  const order = orderResult.rows[0];
  if (!order || Number(order.estado) !== 5) return null;

  const serviceResult = await db.query(
    `
      select s.id, s.nombre, s.precio, coalesce(s.costo, 0) as costo
      from orden_has_servicios ohs
      join servicios s on s.id = ohs.servicio_id
      where ohs.orden_id = $1
    `,
    [orderId]
  );
  const partsResult = await db.query(
    `
      select ore.*, ii.producto
      from orden_repuestos ore
      left join inventario_items ii on ii.id = ore.inventario_item_id
      where ore.orden_id = $1
    `,
    [orderId]
  );

  const servicesCost = serviceResult.rows.reduce((sum, service) => sum + asInt(service.costo), 0);
  const partsCost = partsResult.rows.reduce((sum, part) => sum + asInt(part.total_costo), 0);
  const directCost = servicesCost + partsCost;
  const saleResult = await db.query(
    `
      insert into ventas (
        tipo, orden_id, fecha, metodo_pago, total_bruto, costo_directo, notas, responsable, estado, updated_at
      )
      values ('ot', $1, coalesce($2, $3, $4, now()), $5, $6, $7, $8, $9, 1, now())
      on conflict (orden_id) where orden_id is not null and tipo = 'ot'
      do update set
        fecha = excluded.fecha,
        metodo_pago = excluded.metodo_pago,
        total_bruto = excluded.total_bruto,
        costo_directo = excluded.costo_directo,
        responsable = excluded.responsable,
        updated_at = now()
      returning *
    `,
    [
      orderId,
      order.fecha_salida,
      order.fecha_entrega,
      order.created_at,
      normalizePaymentMethod(order.metodopago),
      asInt(order.total),
      directCost,
      `OT ${orderId}`,
      responsable || null,
    ]
  );
  const sale = saleResult.rows[0];

  await db.query("delete from venta_items where venta_id = $1", [sale.id]);
  for (const service of serviceResult.rows) {
    await db.query(
      `
        insert into venta_items (venta_id, servicio_id, descripcion, cantidad, precio_unitario, costo_unitario, total, total_costo)
        values ($1, $2, $3, 1, $4, $5, $4, $5)
      `,
      [sale.id, service.id, service.nombre, asInt(service.precio), asInt(service.costo)]
    );
  }
  for (const part of partsResult.rows) {
    await db.query(
      `
        insert into venta_items (
          venta_id, inventario_item_id, descripcion, cantidad, precio_unitario, costo_unitario, total, total_costo
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        sale.id,
        part.inventario_item_id,
        part.producto,
        part.cantidad,
        part.precio_unitario,
        part.costo_unitario,
        part.total_venta,
        part.total_costo,
      ]
    );
  }

  return sale;
}
