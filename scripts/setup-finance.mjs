import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import pg from "pg";
import { getPostgresSslConfig } from "../lib/postgres-ssl.js";

const { Pool } = pg;
const DEFAULT_XLSX = "/Users/eduardo/Downloads/Ventas_Mactech_2026_30dias (3).xlsx";

function unzipText(xlsxPath, filePath) {
  return execFileSync("unzip", ["-p", xlsxPath, filePath], { encoding: "utf8" });
}

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function cellValue(cellXml, sharedStrings) {
  const type = cellXml.match(/t="(\w+)"/)?.[1];
  const value = cellXml.match(/<v>(.*?)<\/v>/s)?.[1] || "";
  if (type === "s") return sharedStrings[Number(value)] || "";
  return decodeXml(value);
}

function readTranches(xlsxPath) {
  if (!existsSync(xlsxPath)) return [];
  const sharedXml = unzipText(xlsxPath, "xl/sharedStrings.xml");
  const sheetXml = unzipText(xlsxPath, "xl/worksheets/sheet1.xml");
  const sharedStrings = [...sharedXml.matchAll(/<si>(.*?)<\/si>/gs)].map((match) =>
    decodeXml(match[1].replace(/<t[^>]*>(.*?)<\/t>/gs, (_, text) => text).replace(/<[^>]+>/g, ""))
  );
  const tranches = [];
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
    const rowNumber = Number(rowMatch[1]);
    if (rowNumber < 6) continue;
    const row = {};
    for (const cellMatch of rowMatch[2].matchAll(/<c[^>]*r="([A-Z]+)\d+"[^>]*>.*?<\/c>/gs)) {
      row[cellMatch[1]] = cellValue(cellMatch[0], sharedStrings).trim();
    }
    const desde = Math.round(Number(row.B || 0));
    const porcentajeEduardo = Number(row.C || 0);
    const porcentajeTienda = Number(row.D || 1);
    if (!Number.isFinite(desde) || !Number.isFinite(porcentajeEduardo)) continue;
    tranches.push({
      desde,
      porcentaje_eduardo: porcentajeEduardo,
      porcentaje_tienda: Number.isFinite(porcentajeTienda) ? porcentajeTienda : 1 - porcentajeEduardo,
      descripcion: row.E || null,
    });
  }
  return tranches;
}

function readHistoricalSales(xlsxPath, year = 2026) {
  if (!existsSync(xlsxPath)) return [];
  const sharedXml = unzipText(xlsxPath, "xl/sharedStrings.xml");
  const sharedStrings = [...sharedXml.matchAll(/<si>(.*?)<\/si>/gs)].map((match) =>
    decodeXml(match[1].replace(/<t[^>]*>(.*?)<\/t>/gs, (_, text) => text).replace(/<[^>]+>/g, ""))
  );
  const months = [
    { sheet: 3, month: 1, name: "Enero" },
    { sheet: 4, month: 2, name: "Febrero" },
    { sheet: 5, month: 3, name: "Marzo" },
    { sheet: 6, month: 4, name: "Abril" },
    { sheet: 7, month: 5, name: "Mayo" },
    { sheet: 8, month: 6, name: "Junio" },
    { sheet: 9, month: 7, name: "Julio" },
    { sheet: 10, month: 8, name: "Agosto" },
    { sheet: 11, month: 9, name: "Septiembre" },
    { sheet: 12, month: 10, name: "Octubre" },
    { sheet: 13, month: 11, name: "Noviembre" },
    { sheet: 14, month: 12, name: "Diciembre" },
  ];
  const sales = [];

  for (const monthInfo of months) {
    const sheetXml = unzipText(xlsxPath, `xl/worksheets/sheet${monthInfo.sheet}.xml`);
    for (const rowMatch of sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
      const rowNumber = Number(rowMatch[1]);
      if (rowNumber < 4 || rowNumber > 33) continue;
      const row = {};
      for (const cellMatch of rowMatch[2].matchAll(/<c[^>]*r="([A-Z]+)\d+"[^>]*>.*?<\/c>/gs)) {
        row[cellMatch[1]] = cellValue(cellMatch[0], sharedStrings).trim();
      }

      const bruto = Math.round(Number(row.C || 0));
      const liquido = Math.round(Number(row.D || 0));
      const tienda = Math.round(Number(row.F || 0));
      const eduardo = Math.round(Number(row.H || 0));
      if (!bruto && !liquido && !tienda && !eduardo) continue;

      const day = Math.min(28, Math.max(1, Math.round(Number(row.A || row.B || rowNumber - 3))));
      sales.push({
        fecha: `${year}-${String(monthInfo.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        mes: monthInfo.name,
        fila: rowNumber,
        bruto,
        liquido,
        costo: Math.max(0, bruto - liquido),
        porcentaje_tienda: Number(row.E || 0),
        monto_tienda: tienda,
        porcentaje_eduardo: Number(row.G || 0),
        monto_eduardo: eduardo,
        notas: row.I || null,
      });
    }
  }

  return sales;
}

async function setupSchema(client) {
  await client.query("alter table servicios add column if not exists costo integer default 0");
  await client.query("alter table inventario_movimientos add column if not exists costo_unitario integer default 0");
  await client.query("alter table inventario_movimientos add column if not exists total_costo integer default 0");
  await client.query("alter table inventario_movimientos add column if not exists referencia_tipo text");
  await client.query("alter table inventario_movimientos add column if not exists referencia_id integer");

  await client.query(`
    create table if not exists orden_repuestos (
      id integer generated by default as identity primary key,
      orden_id integer references ordenes(id) on delete cascade,
      inventario_item_id integer references inventario_items(id),
      repuesto_id integer references repuestos(id),
      cantidad integer not null default 1,
      costo_unitario integer default 0,
      precio_unitario integer default 0,
      total_costo integer default 0,
      total_venta integer default 0,
      responsable text,
      created_at timestamptz default now()
    )
  `);
  await client.query("alter table orden_repuestos add column if not exists repuesto_id integer references repuestos(id)");
  await client.query(`
    create table if not exists ventas (
      id integer generated by default as identity primary key,
      tipo text not null check (tipo in ('producto', 'ot', 'historico')),
      orden_id integer references ordenes(id) on delete set null,
      fecha timestamptz not null default now(),
      metodo_pago text,
      total_bruto integer default 0,
      costo_directo integer default 0,
      ingreso_liquido integer default 0,
      monto_tienda integer default 0,
      monto_eduardo integer default 0,
      porcentaje_tienda numeric(8, 4) default 0,
      porcentaje_eduardo numeric(8, 4) default 0,
      fuente text,
      fuente_ref text,
      notas text,
      responsable text,
      estado integer default 1,
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    )
  `);
  await client.query("alter table ventas add column if not exists ingreso_liquido integer default 0");
  await client.query("alter table ventas add column if not exists monto_tienda integer default 0");
  await client.query("alter table ventas add column if not exists monto_eduardo integer default 0");
  await client.query("alter table ventas add column if not exists porcentaje_tienda numeric(8, 4) default 0");
  await client.query("alter table ventas add column if not exists porcentaje_eduardo numeric(8, 4) default 0");
  await client.query("alter table ventas add column if not exists fuente text");
  await client.query("alter table ventas add column if not exists fuente_ref text");
  const constraints = await client.query(`
    select conname
    from pg_constraint
    where conrelid = 'ventas'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%tipo%'
  `);
  for (const constraint of constraints.rows) {
    await client.query(`alter table ventas drop constraint if exists ${constraint.conname}`);
  }
  await client.query("alter table ventas add constraint ventas_tipo_check check (tipo in ('producto', 'ot', 'historico'))");
  await client.query(`
    create table if not exists venta_items (
      id integer generated by default as identity primary key,
      venta_id integer references ventas(id) on delete cascade,
      inventario_item_id integer references inventario_items(id),
      servicio_id integer references servicios(id),
      descripcion text,
      cantidad integer not null default 1,
      precio_unitario integer default 0,
      costo_unitario integer default 0,
      total integer default 0,
      total_costo integer default 0
    )
  `);
  await client.query(`
    create table if not exists finanzas_gastos (
      id integer generated by default as identity primary key,
      fecha date not null default current_date,
      categoria text not null,
      descripcion text,
      monto integer not null default 0,
      tipo text not null default 'operativo' check (tipo in ('operativo', 'publicidad', 'compra', 'otro')),
      metodo_pago text,
      estado integer default 1,
      created_at timestamptz default now()
    )
  `);
  await client.query(`
    create table if not exists finanzas_gastos_recurrentes (
      id integer generated by default as identity primary key,
      categoria text not null,
      descripcion text,
      monto integer not null default 0,
      tipo text not null default 'operativo' check (tipo in ('operativo', 'publicidad', 'compra', 'otro')),
      dia integer default 1,
      estado integer default 1,
      created_at timestamptz default now()
    )
  `);
  await client.query(`
    create table if not exists finanzas_tramos (
      id integer generated by default as identity primary key,
      desde integer not null default 0,
      porcentaje_eduardo numeric(8, 4) not null default 0,
      porcentaje_tienda numeric(8, 4) not null default 1,
      descripcion text,
      estado integer default 1
    )
  `);

  await client.query("create index if not exists orden_repuestos_orden_id_idx on orden_repuestos(orden_id)");
  await client.query("create index if not exists ventas_tipo_fecha_idx on ventas(tipo, fecha desc)");
  await client.query(
    "create unique index if not exists ventas_orden_id_unique_idx on ventas(orden_id) where orden_id is not null and tipo = 'ot'"
  );
  await client.query(
    "create unique index if not exists ventas_historicas_fuente_ref_unique_idx on ventas(fuente, fuente_ref) where tipo = 'historico' and fuente is not null and fuente_ref is not null"
  );
  await client.query("create index if not exists venta_items_venta_id_idx on venta_items(venta_id)");
  await client.query("create index if not exists finanzas_gastos_fecha_idx on finanzas_gastos(fecha)");
  await client.query("create index if not exists finanzas_tramos_desde_idx on finanzas_tramos(desde)");
}

async function importTranches(client, xlsxPath) {
  const tranches = readTranches(xlsxPath);
  if (!tranches.length) return 0;
  await client.query("delete from finanzas_tramos");
  for (const tranche of tranches) {
    await client.query(
      `
        insert into finanzas_tramos (desde, porcentaje_eduardo, porcentaje_tienda, descripcion, estado)
        values ($1, $2, $3, $4, 1)
      `,
      [tranche.desde, tranche.porcentaje_eduardo, tranche.porcentaje_tienda, tranche.descripcion]
    );
  }
  return tranches.length;
}

async function backfillClosedOrders(client) {
  const result = await client.query(`
    insert into ventas (tipo, orden_id, fecha, metodo_pago, total_bruto, costo_directo, notas, responsable, estado, updated_at)
    select
      'ot',
      o.id,
      coalesce(o.fecha_salida, o.fecha_entrega, o.created_at, now()),
      case
        when upper(coalesce(o.metodopago, '')) in ('EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO', 'REDBANK', 'OTRO')
          then upper(o.metodopago)
        else 'OTRO'
      end,
      coalesce(o.total, 0),
      coalesce((
        select sum(coalesce(s.costo, 0))::int
        from orden_has_servicios ohs
        join servicios s on s.id = ohs.servicio_id
        where ohs.orden_id = o.id
      ), 0) + coalesce((
        select sum(coalesce(total_costo, 0))::int
        from orden_repuestos ore
        where ore.orden_id = o.id
      ), 0),
      'OT ' || o.id,
      o.tecnico,
      1,
      now()
    from ordenes o
    where o.estado = 5
    on conflict (orden_id) where orden_id is not null and tipo = 'ot'
    do update set
      fecha = excluded.fecha,
      metodo_pago = excluded.metodo_pago,
      total_bruto = excluded.total_bruto,
      costo_directo = excluded.costo_directo,
      updated_at = now()
  `);
  return result.rowCount;
}

async function importHistoricalSales(client, xlsxPath) {
  const sales = readHistoricalSales(xlsxPath, 2026);
  let imported = 0;
  for (const sale of sales) {
    const sourceRef = `${sale.mes}-${sale.fila}`;
    await client.query(
      `
        insert into ventas (
          tipo, fecha, metodo_pago, total_bruto, costo_directo, ingreso_liquido,
          monto_tienda, monto_eduardo, porcentaje_tienda, porcentaje_eduardo,
          fuente, fuente_ref, notas, responsable, estado, updated_at
        )
        values (
          'historico', $1, 'OTRO', $2, $3, $4,
          $5, $6, $7, $8,
          'excel_ventas_2026_30dias', $9, $10, 'Import Excel', 1, now()
        )
        on conflict (fuente, fuente_ref) where tipo = 'historico' and fuente is not null and fuente_ref is not null
        do update set
          fecha = excluded.fecha,
          total_bruto = excluded.total_bruto,
          costo_directo = excluded.costo_directo,
          ingreso_liquido = excluded.ingreso_liquido,
          monto_tienda = excluded.monto_tienda,
          monto_eduardo = excluded.monto_eduardo,
          porcentaje_tienda = excluded.porcentaje_tienda,
          porcentaje_eduardo = excluded.porcentaje_eduardo,
          notas = excluded.notas,
          updated_at = now()
      `,
      [
        sale.fecha,
        sale.bruto,
        sale.costo,
        sale.liquido,
        sale.monto_tienda,
        sale.monto_eduardo,
        sale.porcentaje_tienda,
        sale.porcentaje_eduardo,
        sourceRef,
        sale.notas,
      ]
    );
    imported += 1;
  }
  return imported;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no esta configurado");
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: getPostgresSslConfig(process.env.DATABASE_URL),
  });
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setupSchema(client);
    const tranches = await importTranches(client, xlsxPath);
    const historical = await importHistoricalSales(client, xlsxPath);
    const orders = await backfillClosedOrders(client);
    await client.query("commit");
    console.log(`Finanzas listas. Tramos: ${tranches}. Ventas historicas: ${historical}. OT cerradas sincronizadas: ${orders}.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
