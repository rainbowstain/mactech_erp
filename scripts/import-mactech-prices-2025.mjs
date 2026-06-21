import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import pg from "pg";
import { getPostgresSslConfig } from "../lib/postgres-ssl.js";

const { Client } = pg;

const DEFAULT_XLSX = "/Users/eduardo/Downloads/Precios 2025 MacTech.xlsx";
const SOURCE = "Precios 2025 MacTech";
const BRAND = "Apple";
const DEFAULT_PROVIDER = "MacTech 2025";

let barcodeCounter = 0;

const PART_BY_SHEET = new Map([
  ["PANTALLAS", "Pantalla"],
  ["BATERIAS", "Bateria"],
  ["CRISTALTRASERO", "Tapa Trasera"],
  ["VIDRIOCAMARAS", "Vidrio Camara"],
  ["CHASIS", "Chasis"],
  ["AURICULAR", "Auricular"],
  ["CAMARATRASERA", "Camara Trasera"],
  ["PUERTODECARGA", "Flex De Carga"],
  ["CAMARAFRONTAL", "Camara Delantera"],
  ["ALTAVOZ", "Altavoz"],
  ["PANTALLAAPPLEWATCH", "Pantalla"],
]);

const MODEL_KEY_ALIASES = new Map([
  ["IPHONESE2022", "IPHONESE3RDGEN"],
  ["IPHONE17AIR", "IPHONEAIR"],
  ["SERIES", "SERIESE"],
  ["SERIE540MM", "SERIE5"],
  ["SERIE544MM", "SERIE5"],
  ["SERIESE40MM", "SERIESE"],
  ["SERIESE44MM", "SERIESE"],
]);

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

function cleanText(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function stripAccents(value = "") {
  return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function compactKey(value = "") {
  return stripAccents(value).toUpperCase().replace(/[^A-Z0-9]+/g, "");
}

function asPrice(value) {
  const number = Number(String(value || "").replace(/[^\d]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function titleProvider(value) {
  const clean = cleanText(value);
  if (!clean) return DEFAULT_PROVIDER;
  return clean.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function workbookFile(target) {
  const clean = target.replace(/^\/+/, "");
  if (clean.startsWith("xl/")) return clean;
  return `xl/${clean}`;
}

function readWorkbook(xlsxPath) {
  if (!existsSync(xlsxPath)) throw new Error(`No existe el archivo: ${xlsxPath}`);

  const workbookXml = unzipText(xlsxPath, "xl/workbook.xml");
  const relsXml = unzipText(xlsxPath, "xl/_rels/workbook.xml.rels");
  const sharedXml = (() => {
    try {
      return unzipText(xlsxPath, "xl/sharedStrings.xml");
    } catch {
      return "";
    }
  })();

  const sharedStrings = [...sharedXml.matchAll(/<si>(.*?)<\/si>/gs)].map((match) =>
    decodeXml(match[1].replace(/<t[^>]*>(.*?)<\/t>/gs, (_, text) => text).replace(/<[^>]+>/g, ""))
  );

  const rels = new Map(
    [...relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((match) => [
      match[1],
      workbookFile(match[2]),
    ])
  );

  return [...workbookXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((match) => {
    const name = decodeXml(match[1]);
    const xml = unzipText(xlsxPath, rels.get(match[2]));
    const rows = [];

    for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>(.*?)<\/row>/gs)) {
      const row = { rowNumber: Number(rowMatch[1]) };
      for (const cellMatch of rowMatch[2].matchAll(/<c[^>]*r="([A-Z]+\d+)"[^>]*>.*?<\/c>/gs)) {
        row[columnName(cellMatch[1])] = cleanText(cellValue(cellMatch[0], sharedStrings));
      }

      const hasValue = Object.entries(row).some(([key, value]) => key !== "rowNumber" && value);
      if (hasValue) rows.push(row);
    }

    return { name, key: compactKey(name), rows };
  });
}

function normalizeQuality(value) {
  return cleanText(value)
    .replace(/^iincell$/i, "Incell")
    .replace(/\boled\b/gi, "Oled")
    .replace(/\bgx\b/gi, "GX")
    .replace(/\brj\b/gi, "RJ")
    .replace(/\boem\b/gi, "OEM");
}

function normalizeIphoneName(value) {
  let model = cleanText(value)
    .replace(/\*/g, "")
    .trim()
    .replace(/^iphone/i, "iPhone")
    .replace(/\s+\/\s+/g, "/")
    .replace(/\bpro max\b/gi, "Pro Max")
    .replace(/\bpro\b/gi, "Pro")
    .replace(/\bplus\b/gi, "Plus")
    .replace(/\bmini\b/gi, "mini")
    .replace(/\bmax\b/gi, "Max")
    .replace(/\bair\b/gi, "Air")
    .replace(/\bxs\b/gi, "XS")
    .replace(/\bxr\b/gi, "XR")
    .replace(/\bx\b/gi, "X");

  if (/^iphone\s+17\s+air$/i.test(model)) return "iPhone Air";
  if (/^iphone\s+se\s+2022$/i.test(model)) return "iPhone SE (3rd gen)";
  return model.replace(/^Iphone/i, "iPhone");
}

function splitIphoneModels(value) {
  const clean = cleanText(value).replace(/\*/g, "").trim();
  if (!/^iphone\b/i.test(clean)) return [];
  if (/^iphone\s+12\s*\/\s*pro$/i.test(clean) || /^iphone\s+12\s*\/\s*12\s*pro$/i.test(clean)) {
    return ["iPhone 12", "iPhone 12 Pro"];
  }
  return [normalizeIphoneName(clean)];
}

function watchModels(row) {
  const series = cleanText(row.A).replace(/^Serie S$/i, "Serie SE");
  const size = cleanText(row.B).replace(/\s+/g, "").replace(/MM$/i, "MM");
  return series
    .split("/")
    .map((part) => cleanText([part, size].filter(Boolean).join(" ")))
    .filter(Boolean);
}

function productName({ model, part, variant, isWatch = false }) {
  const subject = isWatch ? `Apple Watch ${model}` : `${BRAND} ${model}`;
  return [subject, part, variant].filter(Boolean).join(" ");
}

function makeWorkshopBarcode() {
  const time = Date.now().toString().slice(-8);
  barcodeCounter = (barcodeCounter + 1) % 10000;
  return `MTT${time}${barcodeCounter.toString().padStart(4, "0")}`;
}

function sheetPart(sheet) {
  return PART_BY_SHEET.get(sheet.key) || null;
}

function priceEntry({ sheet, row, model, part, variant, provider, sale, cost, isWatch = false }) {
  return {
    sheet: sheet.name.trim(),
    rowNumber: row.rowNumber,
    brand: BRAND,
    model,
    modelKey: compactKey(model),
    part,
    variant: normalizeQuality(variant),
    provider,
    sale,
    cost,
    isWatch,
    product: productName({ model, part, variant: normalizeQuality(variant), isWatch }),
    notes: [
      `Proveedor: ${provider}.`,
      `Fuente: ${SOURCE}.`,
      `Hoja: ${sheet.name.trim()}.`,
      `Variante: ${normalizeQuality(variant) || "sin detalle"}.`,
      `Fila: ${row.rowNumber}.`,
    ].join(" "),
  };
}

function extractPantallas(sheet, part) {
  const products = [];
  const providerPairs = [
    { provider: DEFAULT_PROVIDER, valueCol: "C", costCol: "D" },
    { provider: titleProvider(sheet.rows[0]?.E), valueCol: "E", costCol: "F" },
    { provider: titleProvider(sheet.rows[0]?.G), valueCol: "G", costCol: "H" },
    { provider: titleProvider(sheet.rows[0]?.I), valueCol: "I", costCol: "J" },
  ];

  for (const row of sheet.rows) {
    const models = splitIphoneModels(row.A);
    if (!models.length) continue;

    const variant = normalizeQuality(row.B);
    const baseSale = asPrice(row.C);
    for (const pair of providerPairs) {
      const explicitSale = asPrice(row[pair.valueCol]);
      const cost = asPrice(row[pair.costCol]);
      if (!explicitSale && !cost) continue;
      const sale = explicitSale || baseSale;

      for (const model of models) {
        products.push(priceEntry({ sheet, row, model, part, variant, provider: pair.provider, sale, cost }));
      }
    }
  }

  return products;
}

function extractBaterias(sheet, part) {
  const products = [];
  let currentModels = [];

  for (const row of sheet.rows) {
    const directModels = splitIphoneModels(row.A);
    const isVariantRow = /^(certificada|no mensaje)$/i.test(cleanText(row.A));

    if (directModels.length) currentModels = directModels;
    const models = directModels.length ? directModels : isVariantRow ? currentModels : [];
    if (!models.length) continue;

    const sale = asPrice(row.B);
    const cost = asPrice(row.C);
    if (!sale && !cost) continue;

    const variant = isVariantRow ? cleanText(row.A) : "Con mensaje";
    for (const model of models) {
      products.push(priceEntry({ sheet, row, model, part, variant, provider: DEFAULT_PROVIDER, sale, cost }));
    }
  }

  return products;
}

function extractWatchScreens(sheet, part) {
  const products = [];

  for (const row of sheet.rows) {
    const sale = asPrice(row.C);
    const cost = asPrice(row.D);
    if (!sale && !cost) continue;

    for (const model of watchModels(row)) {
      products.push(
        priceEntry({
          sheet,
          row,
          model,
          part,
          variant: "",
          provider: DEFAULT_PROVIDER,
          sale,
          cost,
          isWatch: true,
        })
      );
    }
  }

  return products;
}

function extractSimpleSheet(sheet, part) {
  const products = [];

  for (const row of sheet.rows) {
    const models = splitIphoneModels(row.A);
    if (!models.length) continue;

    const sale = asPrice(row.B);
    const cost = asPrice(row.C);
    if (!sale && !cost) continue;

    const variant = /\*/.test(row.A || "") ? "*" : "";
    for (const model of models) {
      products.push(priceEntry({ sheet, row, model, part, variant, provider: DEFAULT_PROVIDER, sale, cost }));
    }
  }

  return products;
}

function extractProducts(workbook) {
  const products = [];
  const skippedSheets = [];

  for (const sheet of workbook) {
    const part = sheetPart(sheet);
    if (!part) {
      skippedSheets.push({ sheet: sheet.name, reason: "sin mapeo de repuesto" });
      continue;
    }

    if (sheet.key === "PANTALLAS") products.push(...extractPantallas(sheet, part));
    else if (sheet.key === "BATERIAS") products.push(...extractBaterias(sheet, part));
    else if (sheet.key === "PANTALLAAPPLEWATCH") products.push(...extractWatchScreens(sheet, part));
    else products.push(...extractSimpleSheet(sheet, part));
  }

  return { products: dedupeProducts(products), skippedSheets };
}

function dedupeProducts(products) {
  const seen = new Map();
  for (const item of products) {
    const key = [
      item.sheet,
      item.provider,
      item.modelKey,
      item.part,
      item.variant,
      item.sale,
      item.cost,
      item.product,
    ]
      .join("|")
      .toLowerCase();
    if (!seen.has(key)) seen.set(key, item);
  }
  return Array.from(seen.values());
}

async function ensureSchema(client) {
  await client.query(`
    create table if not exists repuestos (
      id integer generated by default as identity primary key,
      nombre text not null,
      precio integer default 0,
      estado integer default 1
    )
  `);
  await client.query("alter table repuestos add column if not exists precio integer default 0");
  await client.query("alter table inventario_items add column if not exists dispositivo_id integer references dispositivos(id)");
  await client.query("alter table inventario_items add column if not exists repuesto_id integer references repuestos(id)");
  await client.query("alter table inventario_items add column if not exists proveedor text");
}

async function getBrandId(client, name) {
  const result = await client.query("select id from equipos where lower(nombre) = lower($1) order by estado desc, id limit 1", [
    name,
  ]);
  if (result.rows[0]) return result.rows[0].id;
  const created = await client.query("insert into equipos (id, nombre, estado) values (nextval('equipos_id_seq'), $1, 1) returning id", [
    name,
  ]);
  return created.rows[0].id;
}

async function loadDeviceIndex(client, brandId) {
  const result = await client.query(
    "select id, nombre, estado from dispositivos where modelo = $1 order by estado desc, id asc",
    [brandId]
  );
  const index = new Map();
  for (const row of result.rows) {
    const key = compactKey(row.nombre);
    if (!index.has(key)) index.set(key, row);
  }
  return index;
}

async function getOrCreateDevice(client, brandId, deviceIndex, model) {
  const key = MODEL_KEY_ALIASES.get(compactKey(model)) || compactKey(model);
  const existing = deviceIndex.get(key);
  if (existing) return { id: existing.id, created: false, matchedName: existing.nombre };

  const created = await client.query(
    "insert into dispositivos (id, nombre, modelo, estado) values (nextval('dispositivos_id_seq'), $1, $2, 1) returning id, nombre",
    [model, brandId]
  );
  const row = { id: created.rows[0].id, nombre: created.rows[0].nombre, estado: 1 };
  deviceIndex.set(compactKey(model), row);
  return { id: row.id, created: true, matchedName: row.nombre };
}

async function getOrCreatePart(client, name) {
  const result = await client.query(
    "select id, nombre from repuestos where $1 = regexp_replace(upper(translate(nombre, 'áéíóúÁÉÍÓÚñÑ', 'aeiouAEIOUnN')), '[^A-Z0-9]+', '', 'g') order by estado desc, id limit 1",
    [compactKey(name)]
  );
  if (result.rows[0]) return result.rows[0].id;

  const created = await client.query(
    "insert into repuestos (id, nombre, precio, estado) values (nextval('repuestos_id_seq'), $1, 0, 1) returning id",
    [name]
  );
  return created.rows[0].id;
}

async function findInventoryItem(client, item, deviceId, partId) {
  const result = await client.query(
    `
      select id
      from inventario_items
      where area = 'taller'
        and dispositivo_id = $1
        and repuesto_id = $2
        and lower(producto) = lower($3)
        and notas ilike $4
        and notas ilike $5
      order by id
      limit 1
    `,
    [deviceId, partId, item.product, `%Proveedor: ${item.provider}.%`, `%Fuente: ${SOURCE}.%`]
  );
  return result.rows[0]?.id || null;
}

async function importProducts(client, products) {
  await ensureSchema(client);

  const brandId = await getBrandId(client, BRAND);
  const deviceIndex = await loadDeviceIndex(client, brandId);
  const partIds = new Map();
  const deviceIds = new Map();
  const createdModels = new Map();

  let createdItems = 0;
  let updatedItems = 0;

  for (const item of products) {
    if (!partIds.has(item.part)) {
      partIds.set(item.part, await getOrCreatePart(client, item.part));
    }

    if (!deviceIds.has(item.modelKey)) {
      const device = await getOrCreateDevice(client, brandId, deviceIndex, item.model);
      deviceIds.set(item.modelKey, device.id);
      if (device.created) createdModels.set(item.model, device.id);
    }

    const deviceId = deviceIds.get(item.modelKey);
    const partId = partIds.get(item.part);
    const existingId = await findInventoryItem(client, item, deviceId, partId);

    if (existingId) {
      await client.query(
        `
          update inventario_items
          set marca = $1,
              producto = $2,
              valor_original = $3,
              descuento = 0,
              valor_venta = $4,
              cantidad = coalesce(cantidad, 0),
              stock_minimo = coalesce(stock_minimo, 0),
              ubicacion = null,
              proveedor = $5,
              notas = $6,
              estado = 1,
              updated_at = now()
          where id = $7
        `,
        [item.brand, item.product, item.cost, item.sale, item.provider, item.notes, existingId]
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
              $5, 0, 0, null, $6, $7, 1,
              $8, $9
            )
          `,
        [item.brand, item.product, makeWorkshopBarcode(), item.cost, item.sale, item.provider, item.notes, deviceId, partId]
      );
      createdItems += 1;
    }
  }

  return {
    createdItems,
    updatedItems,
    createdModels: Array.from(createdModels, ([model, id]) => ({ model, id })),
  };
}

async function previewMatches(client, products) {
  const brandId = await getBrandId(client, BRAND);
  const deviceIndex = await loadDeviceIndex(client, brandId);
  const missingModels = [];
  const seen = new Set();

  for (const item of products) {
    const key = MODEL_KEY_ALIASES.get(compactKey(item.model)) || compactKey(item.model);
    if (!deviceIndex.has(key) && !seen.has(key)) {
      seen.add(key);
      missingModels.push(item.model);
    }
  }

  return {
    missingModels,
    providers: [...new Set(products.map((item) => item.provider))].sort(),
    sheets: [...new Set(products.map((item) => item.sheet))].sort(),
    parts: [...new Set(products.map((item) => item.part))].sort(),
  };
}

function summarizeProducts(products) {
  const bySheet = {};
  for (const item of products) {
    bySheet[item.sheet] = (bySheet[item.sheet] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(bySheet).sort(([a], [b]) => a.localeCompare(b)));
}

async function main() {
  const xlsxPath = process.argv[2] || DEFAULT_XLSX;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no esta configurado.");

  const workbook = readWorkbook(xlsxPath);
  const { products, skippedSheets } = extractProducts(workbook);
  if (!products.length) throw new Error("No se encontraron precios para importar.");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getPostgresSslConfig(process.env.DATABASE_URL),
  });

  await client.connect();
  try {
    await ensureSchema(client);

    if (process.env.DRY_RUN === "1") {
      const preview = await previewMatches(client, products);
      console.log(
        JSON.stringify(
          {
            source: xlsxPath,
            parsedProducts: products.length,
            bySheet: summarizeProducts(products),
            skippedSheets,
            ...preview,
            sample: products.slice(0, 25),
          },
          null,
          2
        )
      );
      return;
    }

    await client.query("begin");
    const result = await importProducts(client, products);
    await client.query("commit");

    console.log(
      JSON.stringify(
        {
          source: xlsxPath,
          parsedProducts: products.length,
          bySheet: summarizeProducts(products),
          skippedSheets,
          ...result,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
