import { query, transaction } from "@/lib/db";

export const INVENTORY_AREAS = new Set(["productos", "taller"]);

export function normalizeArea(area) {
  return INVENTORY_AREAS.has(area) ? area : "productos";
}

export function makeBarcode(area = "productos") {
  const prefix = normalizeArea(area) === "taller" ? "MTT" : "MTP";
  const time = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}${time}${random}`;
}

function asSearch(search) {
  return String(search || "").trim();
}

export async function getInventoryItems({ area = "productos", search = "", barcode = "" } = {}) {
  const normalizedArea = normalizeArea(area);
  const params = [normalizedArea];
  const where = ["area = $1"];
  const cleanSearch = asSearch(search);
  const cleanBarcode = asSearch(barcode);

  if (cleanBarcode) {
    params.push(cleanBarcode);
    where.push(`codigo_barra = $${params.length}`);
  }

  if (cleanSearch) {
    params.push(`%${cleanSearch}%`);
    where.push(`(
      producto ilike $${params.length}
      or marca ilike $${params.length}
      or codigo_barra ilike $${params.length}
      or ubicacion ilike $${params.length}
    )`);
  }

  const result = await query(
    `
      select
        id,
        area,
        marca,
        producto,
        codigo_barra,
        valor_original,
        descuento,
        valor_venta,
        cantidad,
        stock_minimo,
        ubicacion,
        notas,
        estado,
        created_at,
        updated_at
      from inventario_items
      where ${where.join(" and ")}
      order by estado desc, producto asc, id asc
      limit 500
    `,
    params
  );

  return result.rows;
}

export async function getInventoryStats(area = "productos") {
  const result = await query(
    `
      select
        count(*)::int as items,
        coalesce(sum(cantidad), 0)::int as unidades,
        coalesce(sum(cantidad * valor_venta), 0)::int as valorizado,
        count(*) filter (where estado = 1 and cantidad <= stock_minimo)::int as bajo_stock
      from inventario_items
      where area = $1
    `,
    [normalizeArea(area)]
  );
  return result.rows[0];
}

export async function getInventoryItem(id) {
  const result = await query("select * from inventario_items where id = $1", [id]);
  return result.rows[0] || null;
}

export async function createInventoryItem(payload) {
  const barcode = payload.codigo_barra || makeBarcode(payload.area);
  const result = await query(
    `
      insert into inventario_items (
        area,
        marca,
        producto,
        codigo_barra,
        valor_original,
        descuento,
        valor_venta,
        cantidad,
        stock_minimo,
        ubicacion,
        notas,
        estado
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      returning *
    `,
    [
      normalizeArea(payload.area),
      payload.marca,
      payload.producto,
      barcode,
      payload.valor_original,
      payload.descuento,
      payload.valor_venta,
      payload.cantidad,
      payload.stock_minimo,
      payload.ubicacion,
      payload.notas,
      payload.estado,
    ]
  );
  return result.rows[0];
}

export async function updateInventoryItem(id, payload) {
  const result = await query(
    `
      update inventario_items
      set
        marca = $1,
        producto = $2,
        codigo_barra = $3,
        valor_original = $4,
        descuento = $5,
        valor_venta = $6,
        cantidad = $7,
        stock_minimo = $8,
        ubicacion = $9,
        notas = $10,
        estado = $11,
        updated_at = now()
      where id = $12
      returning *
    `,
    [
      payload.marca,
      payload.producto,
      payload.codigo_barra,
      payload.valor_original,
      payload.descuento,
      payload.valor_venta,
      payload.cantidad,
      payload.stock_minimo,
      payload.ubicacion,
      payload.notas,
      payload.estado,
      id,
    ]
  );
  return result.rows[0] || null;
}

export async function disableInventoryItem(id) {
  const result = await query(
    "update inventario_items set estado = 0, updated_at = now() where id = $1 returning *",
    [id]
  );
  return result.rows[0] || null;
}

export async function moveInventoryStock(id, { tipo, cantidad, motivo, responsable, costo_unitario = 0 }) {
  return transaction(async (client) => {
    const itemResult = await client.query("select * from inventario_items where id = $1 for update", [id]);
    const item = itemResult.rows[0];
    if (!item) return null;

    const previous = Number(item.cantidad || 0);
    const amount = Math.max(0, Math.round(Number(cantidad || 0)));
    const unitCost = Math.max(0, Math.round(Number(costo_unitario || item.valor_original || 0)));
    const totalCost = unitCost * amount;
    let next = previous;

    if (tipo === "entrada") next = previous + amount;
    else if (tipo === "salida") next = Math.max(0, previous - amount);
    else next = amount;

    const updated = await client.query(
      "update inventario_items set cantidad = $1, updated_at = now() where id = $2 returning *",
      [next, id]
    );
    await client.query(
      `
        insert into inventario_movimientos (
          item_id,
          tipo,
          cantidad,
          cantidad_anterior,
          cantidad_nueva,
          costo_unitario,
          total_costo,
          motivo,
          responsable
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [id, tipo, amount, previous, next, unitCost, totalCost, motivo || null, responsable || null]
    );

    if (tipo === "entrada" && totalCost > 0) {
      await client.query(
        `
          insert into finanzas_gastos (fecha, categoria, descripcion, monto, tipo, metodo_pago, estado)
          values (current_date, $1, $2, $3, 'compra', null, 1)
        `,
        [item.area === "taller" ? "Compra repuestos" : "Compra productos", motivo || item.producto, totalCost]
      );
    }

    return updated.rows[0];
  });
}
