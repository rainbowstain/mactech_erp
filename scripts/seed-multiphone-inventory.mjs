import { spawnSync } from "node:child_process";
import pg from "pg";
import { getPostgresSslConfig } from "../lib/postgres-ssl.js";

const { Client } = pg;

const PDF_PATH =
  process.argv[2] || "/Users/eduardo/Downloads/LISTA DE PRECIOS MULTIPHONE CHILE ANTOFAGASTA 06.08.pdf";
const PROVIDER = "Multiphone Chile Antofagasta";
const SOURCE = "Lista de precios 06.08";
let barcodeCounter = 0;

function makeWorkshopBarcode() {
  const time = Date.now().toString().slice(-8);
  barcodeCounter = (barcodeCounter + 1) % 10000;
  const suffix = barcodeCounter.toString().padStart(4, "0");
  return `MTT${time}${suffix}`;
}

const BRAND_ALIASES = new Map([
  ["IPHONE", "Apple"],
  ["APPLE", "Apple"],
  ["APPLE IPAD", "Apple"],
  ["IPAD", "Apple"],
  ["SAMSUNG", "Samsung"],
  ["HUAWEI", "Huawei"],
  ["HONOR", "Honor"],
  ["MOTO", "Motorola"],
  ["MOTOROLA", "Motorola"],
  ["XIAOMI", "Xiaomi"],
  ["OPPO", "Oppo"],
  ["TECNO", "Tecno"],
  ["REALME", "Realme"],
  ["LENOVO", "Lenovo"],
  ["VIVO", "Vivo"],
  ["LG", "LG"],
]);

const PART_PATTERNS = [
  ["FLEX DE BATERIA", "Flex de bateria"],
  ["FLEX DE CARGA", "Flex de carga"],
  ["FLEX CON MICROFONO", "Flex microfono"],
  ["FLEX MICROFONO", "Flex microfono"],
  ["FLEX ENCENDIDO", "Flex encendido"],
  ["FLEX VOLUMEN", "Flex volumen"],
  ["FLEX LCD", "Flex LCD"],
  ["MAIN FLEX", "Main flex"],
  ["VIDRIO DE CAMARA", "Vidrio camara"],
  ["VIDRIO CAMARA", "Vidrio camara"],
  ["CAMARA TRASERA", "Camara trasera"],
  ["CAMARA DELANTERA", "Camara delantera"],
  ["CAMARA SELFIE", "Camara delantera"],
  ["AURICULAR CON FLEX", "Auricular con flex"],
  ["AURICULAR", "Auricular"],
  ["DISCO ALTAVOZ", "Altavoz"],
  ["ALTAVOZ", "Altavoz"],
  ["BANDEJA SIM", "Bandeja SIM"],
  ["BATERIAS", "Bateria"],
  ["BATERIA", "Bateria"],
  ["PANTALLAS", "Pantalla"],
  ["PANTALLA", "Pantalla"],
  ["TACTIL", "Tactil"],
  ["GLASS", "Glass"],
  ["TAPAS", "Tapa trasera"],
  ["TAPA", "Tapa trasera"],
  ["CHASIS", "Chasis"],
  ["HUELLA", "Flex huella"],
];

const QUALITY_WORDS = new Set([
  "ORIGINAL",
  "ORIG",
  "OLED",
  "INCELL",
  "TACTIL",
  "GLASS",
  "FLEX",
  "BATERIA",
  "BATERIAS",
  "CAMARA",
  "AURICULAR",
  "BANDEJA",
  "CHASIS",
  "TAPAS",
  "TAPA",
  "VIDRIO",
  "MAIN",
  "CON",
  "SIN",
  "BIG",
  "SMALL",
  "CM",
  "SM",
  "CN",
  "GX",
  "JK",
  "ZY",
  "DD",
  "RJ",
  "KD",
  "CVT-SRVI",
  "HD+",
  "FHD",
  "IC",
  "INTER.",
  "100%",
]);

function cleanText(value = "") {
  return String(value)
    .normalize("NFKC")
    .replace(/[¡!]/g, " ")
    .replace(/\bPRECIOS?\b|\bINCLUYEN\b|\bINCLU\s*YEN\b|\bIVA\b/gi, " ")
    .replace(/\bMULTIPHONECHILE\.CL\b|\bIG:\s*MULTIPHONE\.CHILE\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCasePart(value) {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bSim\b/g, "SIM")
    .replace(/\bLcd\b/g, "LCD");
}

function detectBrand(text) {
  const upper = text.toUpperCase();
  for (const [alias, brand] of BRAND_ALIASES) {
    if (upper.includes(alias)) return brand;
  }
  return null;
}

function detectPart(text) {
  const upper = text.toUpperCase();
  for (const [needle, part] of PART_PATTERNS) {
    if (upper.includes(needle)) return part;
  }
  return null;
}

function stripContextWords(text, brand, part) {
  let value = cleanText(text);
  const removals = [
    ...PART_PATTERNS.map(([needle]) => needle),
    brand,
    "IPHONE",
    "APPLE",
    "IPAD",
    "SAMSUNG",
    "HUAWEI",
    "HONOR",
    "MOTO",
    "MOTOROLA",
    "XIAOMI",
    "OPPO",
    "TECNO",
    "REALME",
    "LENOVO",
    "VIVO",
    "LG",
    part,
    "PANTALLAS",
    "PANTALLA",
    "BATERIAS",
    "BATERIA",
    "TAPAS",
    "TAPA",
    "HOME Y HUELLA",
    "HOME Y",
    "CON HOME Y",
    "SIN HOME",
    "COMPLETO",
    "ATRAS",
    "ATRÁS",
  ].filter(Boolean);

  for (const word of removals) {
    value = value.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), " ");
  }

  return cleanText(value);
}

function cleanModelPrefix(model) {
  return cleanText(model)
    .replace(/^(?:CAMARA|CÁMARA)\s+(?:SELFIE|TRASERA|DELANTERA)\s+/i, "")
    .replace(/^FLEX\s+(?:DE\s+)?(?:ENCENDIDO|VOLUMEN|CARGA|BATERIA|BATERÍA)\s+/i, "")
    .replace(/^ENCENDIDO\s+Y\s+HUELLA\s+/i, "")
    .replace(/^HUELLA\s+/i, "")
    .replace(/^VIDRIO\s+(?:DE\s+)?(?:CAMARA|CÁMARA)\s+/i, "")
    .replace(/^FLEX\s+COMPLETO\s+/i, "")
    .replace(/^COMPLETO\s+/i, "")
    .replace(/^CON\s+HOME\s+Y\s+/i, "")
    .replace(/^HOME\s+Y\s+HUELLA\s+/i, "")
    .replace(/^SIN\s+HOME\s+/i, "")
    .replace(/^ATR(?:A|Á)S\s+/i, "")
    .trim();
}

function canonicalModel(brand, rawModel, pagePart) {
  let model = cleanModelPrefix(rawModel)
    .replace(/\bCONECTOR\s+FPC\b/gi, "")
    .replace(/\bORI\.?$/i, "")
    .replace(/\bORIG\.?$/i, "")
    .replace(/\bORIGINAL$/i, "")
    .replace(/\b([AMJS])\s+(\d)/gi, "$1$2")
    .trim();

  model = cleanModelPrefix(model);

  if (!model) return null;

  if (brand === "Apple") {
    if (/^(?:\d{1,2}|SE|X|XR|XS)\b/i.test(model) || /^\d+[GPS]?/i.test(model)) {
      model = model
        .replace(/^(\d+)G\b/i, "$1")
        .replace(/^(\d+)P(?:LUS)?\b/i, "$1 Plus")
        .replace(/^(\d+) PLUS\b/i, "$1 Plus")
        .replace(/^SE 2020\b/i, "SE (2nd gen)")
        .replace(/^SE 2022\b/i, "SE (3rd gen)");
      model = `iPhone ${model}`;
    } else if (/^AIR|^MINI|^PRO|^A\d|^IPAD/i.test(model) || /IPAD/i.test(pagePart || "")) {
      model = model.replace(/^IPAD\s*/i, "");
      model = `iPad ${model}`;
    }
  }

  if (brand === "Samsung" && /^(A|M|S|J|NOTE|Z)\s?\d|^Z\s|^NOTE\s/i.test(model)) {
    model = model.replace(/^NOTE\b/i, "Note");
    model = model.replace(/\bS(\d{1,2})U\b/gi, "S$1 Ultra");
    model = model.replace(/\bULTRA\b/g, "Ultra").replace(/\bPLUS\b/g, "Plus");
    if (!/^Galaxy\b/i.test(model)) model = `Galaxy ${model}`;
  }

  return cleanText(model);
}

function normalizeSplitModel(brand, model) {
  if (brand === "Samsung") {
    let next = model.replace(/\bS(\d{1,2})U\b/gi, "S$1 Ultra");
    next = next.replace(/\bULTRA\b/g, "Ultra").replace(/\bPLUS\b/g, "Plus");
    if (/^(A|M|S|J|Note|Z)\s?\d|^Z\s/i.test(next) && !/^Galaxy\b/i.test(next)) next = `Galaxy ${next}`;
    return cleanText(next);
  }
  if (brand === "Apple" && /^(?:\d{1,2}|SE|X|XR|XS)\b/i.test(model) && !/^iPhone\b/i.test(model)) {
    return cleanText(`iPhone ${model}`);
  }
  return cleanText(model);
}

function splitModels(model, brand) {
  if (!model) return [];
  if (!/[\/]/.test(model)) return [model];

  const parts = model.split("/").map((part) => cleanText(part)).filter(Boolean);
  const first = parts[0];
  const devicePrefix = first.match(/^(Galaxy|iPhone|iPad)\s+/i)?.[0] || "";
  const baseWithoutLastToken = first.replace(/\s+\S+$/, " ");

  return parts.map((part, index) => {
    if (index === 0) return normalizeSplitModel(brand, part);
    let next;
    if (/^(Galaxy|iPhone|iPad|Redmi|Poco|Mi|Note|Mate|Nova|Pura|Y|P|G|E|C|V|X|A|M|S|J|T)\b/i.test(part)) {
      next = cleanText(`${devicePrefix}${part}`);
    } else if (/^\d+G$/i.test(part)) {
      next = cleanText(`${baseWithoutLastToken}${part}`);
    } else {
      next = cleanText(`${devicePrefix}${part}`);
    }
    return normalizeSplitModel(brand, next);
  });
}

function parseEntry(entry, context) {
  let text = stripContextWords(entry, context.brand, context.part);
  if (!text || /^\$/.test(text) || /^ORIGINAL|^OLED|^INCELL$/i.test(text)) return null;

  const words = text.split(" ");
  let splitAt = words.findIndex((word, index) => index > 0 && QUALITY_WORDS.has(word.toUpperCase()));
  if (splitAt < 0) splitAt = Math.min(words.length, 3);

  const model = canonicalModel(context.brand, words.slice(0, splitAt).join(" "), context.part);
  const variant = cleanText(words.slice(splitAt).join(" "));
  if (
    !model ||
    /^(AL L|INCELL|OLED|ORIGINAL|ORIG|CM|SM|DE|Y)$/i.test(model) ||
    /\b(?:HUELLA|FLEX|CAMARA|CÁMARA|VIDRIO|HOME|ATRAS|ATRÁS|COMPLETO)\b/i.test(model) ||
    /^(?:CON\s+OCA|OCA|TACTIL|TÁCTIL)$/i.test(model)
  ) {
    return null;
  }

  return { model, variant };
}

function parsePrice(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  const number = Number(digits);
  return Number.isFinite(number) ? number : 0;
}

function extractProducts(text) {
  const products = [];
  let context = { brand: null, part: null };
  const pricePattern = /\$\s*[\d.,]+/g;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = cleanText(rawLine);
    if (!line) continue;

    const lineBrand = detectBrand(line);
    const linePart = detectPart(line);
    if (lineBrand) context.brand = lineBrand;
    if (linePart) context.part = linePart;
    if (!context.brand || !context.part) continue;

    const matches = Array.from(line.matchAll(pricePattern));
    if (!matches.length) continue;

    let cursor = 0;
    for (const match of matches) {
      const before = cleanText(line.slice(cursor, match.index));
      const price = parsePrice(match[0]);
      cursor = match.index + match[0].length;
      if (!before || !price) continue;

      const parsed = parseEntry(before, context);
      if (!parsed) continue;

      for (const model of splitModels(parsed.model, context.brand)) {
        const product = [
          context.brand,
          model,
          context.part,
          parsed.variant,
        ]
          .filter(Boolean)
          .join(" ");
        products.push({
          brand: context.brand,
          model,
          part: context.part,
          variant: parsed.variant,
          product,
          cost: price,
          notes: `Proveedor: ${PROVIDER}. ${SOURCE}. Variante: ${parsed.variant || "sin detalle"}.`,
        });
      }
    }
  }

  return products;
}

function extractPdfText(pdfPath) {
  const python = `
import sys
sys.path.insert(0, "tmp/pdfdeps")
import pdfplumber
with pdfplumber.open(sys.argv[1]) as pdf:
    for page in pdf.pages:
        print(page.extract_text(x_tolerance=1, y_tolerance=3) or "")
        print("\\n---PAGE---\\n")
`;
  const result = spawnSync("python3", ["-c", python, pdfPath], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "No se pudo extraer texto del PDF.");
  }
  return result.stdout;
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
  if (existing.rows[0]) {
    await client.query("update equipos set nombre = $1, estado = 1 where id = $2", [name, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const created = await client.query("insert into equipos (id, nombre, estado) values (nextval('equipos_id_seq'), $1, 1) returning id", [name]);
  return created.rows[0].id;
}

async function getOrCreateDevice(client, brandId, name) {
  const existing = await client.query(
    "select id from dispositivos where modelo = $1 and lower(nombre) = lower($2) order by id limit 1",
    [brandId, name]
  );
  if (existing.rows[0]) {
    await client.query("update dispositivos set nombre = $1, estado = 1 where id = $2", [name, existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const created = await client.query(
    "insert into dispositivos (id, nombre, modelo, estado) values (nextval('dispositivos_id_seq'), $1, $2, 1) returning id",
    [name, brandId]
  );
  return created.rows[0].id;
}

async function getOrCreatePart(client, name) {
  const existing = await client.query("select id from repuestos where lower(nombre) = lower($1) order by id limit 1", [name]);
  if (existing.rows[0]) {
    await client.query("update repuestos set nombre = $1, estado = 1 where id = $2", [titleCasePart(name), existing.rows[0].id]);
    return existing.rows[0].id;
  }
  const created = await client.query(
    "insert into repuestos (id, nombre, precio, estado) values (nextval('repuestos_id_seq'), $1, 0, 1) returning id",
    [titleCasePart(name)]
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

  const text = extractPdfText(PDF_PATH);
  const products = dedupeProducts(extractProducts(text));
  if (!products.length) throw new Error("No se encontraron productos para importar.");

  if (process.env.DRY_RUN === "1") {
    console.log(
      JSON.stringify(
        {
          source: PDF_PATH,
          provider: PROVIDER,
          parsedProducts: products.length,
          brands: [...new Set(products.map((item) => item.brand))].sort(),
          parts: [...new Set(products.map((item) => item.part))].sort(),
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
  const brandIds = new Map();
  const deviceIds = new Map();
  const partIds = new Map();
  let createdItems = 0;
  let updatedItems = 0;
  let createdModels = 0;
  let createdBrands = 0;
  let createdParts = 0;

  try {
    await client.query("begin");
    await client.query("alter table inventario_items add column if not exists proveedor text");

    for (const product of products) {
      if (!brandIds.has(product.brand)) {
        const before = await client.query("select id from equipos where lower(nombre) = lower($1) limit 1", [product.brand]);
        brandIds.set(product.brand, await getOrCreateBrand(client, product.brand));
        if (!before.rows[0]) createdBrands += 1;
      }

      const brandId = brandIds.get(product.brand);
      const deviceKey = `${brandId}|${product.model}`.toLowerCase();
      if (!deviceIds.has(deviceKey)) {
        const before = await client.query(
          "select id from dispositivos where modelo = $1 and lower(nombre) = lower($2) limit 1",
          [brandId, product.model]
        );
        deviceIds.set(deviceKey, await getOrCreateDevice(client, brandId, product.model));
        if (!before.rows[0]) createdModels += 1;
      }

      if (!partIds.has(product.part.toLowerCase())) {
        const before = await client.query("select id from repuestos where lower(nombre) = lower($1) limit 1", [product.part]);
        partIds.set(product.part.toLowerCase(), await getOrCreatePart(client, product.part));
        if (!before.rows[0]) createdParts += 1;
      }

      const deviceId = deviceIds.get(deviceKey);
      const partId = partIds.get(product.part.toLowerCase());
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
        source: PDF_PATH,
        provider: PROVIDER,
        parsedProducts: products.length,
        createdItems,
        updatedItems,
        createdBrands,
        createdModels,
        createdParts,
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
