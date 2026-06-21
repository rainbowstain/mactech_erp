import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import pg from "pg";
import { getPostgresSslConfig } from "../lib/postgres-ssl.js";

const { Client } = pg;

const XLSX_PATH = process.argv[2] || "/Users/eduardo/Downloads/PRECIOS PANTALLA IPHONE 06-03-2026.xlsx";
const PROVIDER = "Teccel";
const SOURCE = "Precios pantalla iPhone 06-03-2026";
const BRAND = "Apple";
const PART = "Pantalla";
let barcodeCounter = 0;

function makeWorkshopBarcode() {
  const time = Date.now().toString().slice(-8);
  barcodeCounter = (barcodeCounter + 1) % 10000;
  return `MTT${time}${barcodeCounter.toString().padStart(4, "0")}`;
}

function decodeXml(value = "") {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function unzipText(xlsxPath, filePath) {
  return execFileSync("unzip", ["-p", xlsxPath, filePath], { encoding: "utf8" });
}

function columnName(cellRef) {
  return cellRef.match(/[A-Z]+/)?.[0] || "";
}

function cellValue(cellXml, sharedStrings) {
  const type = cellXml.match(/t="(\w+)"/)?.[1];
  const value = cellXml.match(/<v>(.*?)<\/v>/s)?.[1] || "";
  if (type === "s") return sharedStrings[Number(value)] || "";
  if (type === "inlineStr") return decodeXml(cellXml.match(/<t[^>]*>(.*?)<\/t>/s)?.[1] || "");
  return decodeXml(value);
}

function readWorkbookRows(xlsxPath) {
  if (!existsSync(xlsxPath)) throw new Error(`No existe el archivo: ${xlsxPath}`);

  const sharedXml = unzipText(xlsxPath, "xl/sharedStrings.xml");
  const sheetXml = unzipText(xlsxPath, "xl/worksheets/sheet1.xml");
  const sharedStrings = [...sharedXml.matchAll(/<si>(.*?)<\/si>/gs)].map((match) =>
    decodeXml(match[1].replace(/<t[^>]*>(.*?)<\/t>/gs, (_, text) => text).replace(/<[^>]+>/g, ""))
  );

  const rows = [];
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
    const rowNumber = Number(rowMatch[1]);
    if (rowNumber === 1) continue;

    const row = { rowNumber };
    for (const cellMatch of rowMatch[2].matchAll(/<c[^>]*r="([A-Z]+\d+)"[^>]*>.*?<\/c>/gs)) {
      row[columnName(cellMatch[1])] = cellValue(cellMatch[0], sharedStrings).trim();
    }

    if (row.A || row.B || row.C || row.D || row.E) rows.push(row);
  }

  return rows;
}

function cleanText(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function asPrice(value) {
  const number = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function canonicalIphoneModel(rawModel) {
  let model = cleanText(rawModel)
    .replace(/\((.*?)\)/g, "")
    .replace(/\bBLANCO\b/gi, "")
    .replace(/^IPHONE\s*/i, "")
    .replace(/\s*\/\s*/g, "/")
    .trim();

  model = model
    .replace(/^SE 2020$/i, "SE (2nd gen)")
    .replace(/^SE 2022$/i, "SE (3rd gen)")
    .replace(/^(\d+)\s*PRO$/i, "$1 Pro")
    .replace(/^(\d+)\s*PRO MAX$/i, "$1 Pro Max")
    .replace(/^(\d+)\s*PLUS$/i, "$1 Plus")
    .replace(/^(\d+)\s*MINI$/i, "$1 mini")
    .replace(/^(\d+)E$/i, "$1e")
    .replace(/^XS MAX$/i, "XS Max")
    .replace(/^XR$/i, "XR")
    .replace(/^X$/i, "X")
    .replace(/^(\d+)S$/i, "$1s");

  return cleanText(`iPhone ${model}`);
}

function splitModels(rawModel) {
  const clean = cleanText(rawModel);
  if (/IPHONE 8\s*\/\s*SE 2020/i.test(clean)) return ["iPhone 8", "iPhone SE (2nd gen)"];
  if (/IPHONE 12\s*\/\s*12PRO/i.test(clean)) return ["iPhone 12", "iPhone 12 Pro"];
  return [canonicalIphoneModel(clean)];
}

function variantFrom(row) {
  const model = cleanText(row.C || "");
  const parts = [cleanText(row.D || "")];
  if (/\bBLANCO\b/i.test(model)) parts.push("Blanco");
  const copyGlass = model.match(/\((.*?)\)/)?.[1];
  if (copyGlass) parts.push(cleanText(copyGlass));
  return parts.filter(Boolean).join(" ");
}

function extractProducts(rows) {
  const products = [];
  const skipped = [];

  for (const row of rows) {
    const price = asPrice(row.E);
    if (!price) {
      skipped.push({ row: row.rowNumber, model: row.C || "", quality: row.D || "", reason: "sin precio" });
      continue;
    }

    const variant = variantFrom(row);
    for (const model of splitModels(row.C || "")) {
      const product = [BRAND, model, PART, variant].filter(Boolean).join(" ");
      products.push({
        brand: BRAND,
        model,
        part: PART,
        variant,
        product,
        cost: price,
        notes: `Proveedor: ${PROVIDER}. ${SOURCE}. Variante: ${variant || "sin detalle"}.`,
      });
    }
  }

  return { products: dedupeProducts(products), skipped };
}

function dedupeProducts(products) {
  const seen = new Map();
  for (const item of products) {
    const key = [item.brand, item.model, item.part, item.variant, item.cost].join("|").toLowerCase();
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

async function getOrCreateBrand(client, name) {
  const existing = await client.query("select id from equipos where lower(nombre) = lower($1) order by id limit 1", [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query("insert into equipos (id, nombre, estado) values (nextval('equipos_id_seq'), $1, 1) returning id", [name]);
  return created.rows[0].id;
}

async function getOrCreateDevice(client, brandId, name) {
  const existing = await client.query(
    "select id from dispositivos where modelo = $1 and lower(nombre) = lower($2) order by id limit 1",
    [brandId, name]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query(
    "insert into dispositivos (id, nombre, modelo, estado) values (nextval('dispositivos_id_seq'), $1, $2, 1) returning id",
    [name, brandId]
  );
  return created.rows[0].id;
}

async function getOrCreatePart(client, name) {
  const existing = await client.query("select id from repuestos where lower(nombre) = lower($1) order by id limit 1", [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query(
    "insert into repuestos (id, nombre, precio, estado) values (nextval('repuestos_id_seq'), $1, 0, 1) returning id",
    [name]
  );
  return created.rows[0].id;
}

async function findInventoryItem(client, deviceId, partId, product) {
  const result = await client.query(
    `
      select id
      from inventario_items
      where area = 'taller'
        and dispositivo_id = $1
        and repuesto_id = $2
        and lower(producto) = lower($3)
        and notas ilike $4
      order by id
      limit 1
    `,
    [deviceId, partId, product, `%Proveedor: ${PROVIDER}%`]
  );
  return result.rows[0]?.id || null;
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no esta configurado.");

  const { products, skipped } = extractProducts(readWorkbookRows(XLSX_PATH));
  if (!products.length) throw new Error("No se encontraron productos con precio para importar.");

  if (process.env.DRY_RUN === "1") {
    console.log(
      JSON.stringify(
        {
          source: XLSX_PATH,
          provider: PROVIDER,
          parsedProducts: products.length,
          skipped,
          sample: products.slice(0, 30),
        },
        null,
        2
      )
    );
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getPostgresSslConfig(process.env.DATABASE_URL),
  });

  await client.connect();
  let createdItems = 0;
  let updatedItems = 0;
  let createdModels = 0;

  try {
    await client.query("begin");
    await client.query("alter table inventario_items add column if not exists proveedor text");
    const brandId = await getOrCreateBrand(client, BRAND);
    const partId = await getOrCreatePart(client, PART);
    const deviceIds = new Map();

    for (const product of products) {
      if (!deviceIds.has(product.model)) {
        const before = await client.query(
          "select id from dispositivos where modelo = $1 and lower(nombre) = lower($2) limit 1",
          [brandId, product.model]
        );
        deviceIds.set(product.model, await getOrCreateDevice(client, brandId, product.model));
        if (!before.rows[0]) createdModels += 1;
      }

      const deviceId = deviceIds.get(product.model);
      const existingId = await findInventoryItem(client, deviceId, partId, product.product);

      if (existingId) {
        await client.query(
          `
            update inventario_items
            set marca = $1,
                valor_original = $2,
                descuento = 0,
                valor_venta = $2,
                cantidad = coalesce(cantidad, 0),
                stock_minimo = coalesce(stock_minimo, 0),
                proveedor = $3,
                notas = $4,
                estado = 1,
                updated_at = now()
            where id = $5
          `,
          [product.brand, product.cost, PROVIDER, product.notes, existingId]
        );
        updatedItems += 1;
      } else {
        await client.query(
          `
            insert into inventario_items (
              id, area, marca, producto, codigo_barra, valor_original, descuento,
              valor_venta, cantidad, stock_minimo, ubicacion, proveedor, notas, estado,
              dispositivo_id, repuesto_id
            )
            values (
              nextval('inventario_items_id_seq'), 'taller', $1, $2, $3, $4, 0,
              $4, 0, 0, null, $5, $6, 1,
              $7, $8
            )
          `,
          [product.brand, product.product, makeWorkshopBarcode(), product.cost, PROVIDER, product.notes, deviceId, partId]
        );
        createdItems += 1;
      }
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }

  console.log(
    JSON.stringify(
      {
        source: XLSX_PATH,
        provider: PROVIDER,
        parsedProducts: products.length,
        skippedRows: skipped.length,
        createdItems,
        updatedItems,
        createdModels,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
