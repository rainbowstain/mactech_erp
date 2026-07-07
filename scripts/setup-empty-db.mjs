import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import pg from "pg";
import { getPostgresSslConfig } from "../lib/postgres-ssl.js";
import { BRAND_MODELS, PART_TYPES } from "../lib/seed-data.js";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "db", "schema.sql");

const ORDER_STATES = [
  [1, "INGRESADO"],
  [2, "EN REVISION"],
  [3, "PARA RETIRO"],
  [4, "GARANTIA"],
  [5, "ENTREGADO"],
  [6, "ESPERA REPUESTO"],
];

const DEVICE_STATES = [
  [1, "Prendido"],
  [2, "Apagado"],
  [3, "Bloqueado"],
];

const SERVICES = [
  ["Mantenimiento", 19990],
  ["Cambio de bateria", 19990],
  ["Cambio de pantalla", 19990],
  ["Respaldo de informacion", 29990],
  ["Restauracion de sistema", 29990],
  ["Bano quimico", 29990],
  ["Recuperacion de cuenta", 29990],
];

const QUESTIONS = [
  "Equipo presenta abollones, golpes, caidas y eventos que danen el cuerpo del equipo?",
  "Equipo presenta imagen?",
  "Presenta golpes, roturas o trizaduras en pantalla?",
  "Funciona boton de volumen y silencio?",
  "Falta algun perno de seguridad?",
  "Funciona flash y vibrador?",
  "Funciona puerto de carga?",
  "Funciona auricular y bocina de altavoces?",
  "Equipo ha sido manipulado anteriormente?",
  "Funciona sensor de proximidad?",
  "Contacto con liquido de forma directa o indirecta?",
  "Funciona camara frontal y trasera?",
  "Usa cargador original?",
  "Funciona Face ID?",
];

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} no esta configurado.`);
  return value;
}

async function seedFixedId(client, table, columns, rows) {
  for (const row of rows) {
    const params = row.map((_, index) => `$${index + 1}`).join(", ");
    await client.query(`insert into ${table} (${columns.join(", ")}) values (${params})`, row);
  }
  await client.query(`
    select setval(
      pg_get_serial_sequence('${table}', 'id'),
      coalesce((select max(id) from ${table}), 1),
      true
    )
  `);
}

async function main() {
  if (process.env.RESET_EMPTY_DB_CONFIRM !== "SI") {
    throw new Error("Este script reinicia la BD. Ejecuta con RESET_EMPTY_DB_CONFIRM=SI si quieres partir de cero.");
  }

  const databaseUrl = requiredEnv("DATABASE_URL");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminName = process.env.ADMIN_NAME || "Admin";
  const adminPassword = requiredEnv("ADMIN_PASSWORD");
  if (adminPassword.length < 8) throw new Error("ADMIN_PASSWORD debe tener al menos 8 caracteres.");

  const client = new Client({
    connectionString: databaseUrl,
    ssl: getPostgresSslConfig(databaseUrl),
  });

  await client.connect();
  try {
    await client.query("begin");
    const schema = await fs.readFile(schemaPath, "utf8");
    await client.query(schema);

    await seedFixedId(client, "estados_ordenes", ["id", "nombre_estado"], ORDER_STATES);
    await seedFixedId(client, "estado_equipos", ["id", "nombre"], DEVICE_STATES);

    for (const [brand, models] of Object.entries(BRAND_MODELS)) {
      const brandResult = await client.query("insert into equipos (nombre, estado) values ($1, 1) returning id", [brand]);
      const brandId = brandResult.rows[0].id;
      for (const model of models) {
        await client.query("insert into dispositivos (nombre, modelo, estado) values ($1, $2, 1)", [model, brandId]);
      }
    }

    for (const name of PART_TYPES) {
      await client.query("insert into repuestos (nombre, estado) values ($1, 1)", [name]);
    }

    for (const [name, price] of SERVICES) {
      await client.query("insert into servicios (nombre, precio, costo, estado) values ($1, $2, 0, 1)", [name, price]);
    }

    for (const question of QUESTIONS) {
      await client.query("insert into preguntas (descripcion, estado) values ($1, 1)", [question]);
    }

    await client.query(
      "insert into finanzas_tramos (desde, porcentaje_eduardo, porcentaje_tienda, descripcion, estado) values (0, 0, 1, 'Base inicial', 1)"
    );

    const hash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      "insert into users (name, email, role, estado, password, updated_at) values ($1, $2, 'admin', true, $3, now())",
      [adminName, adminEmail.toLowerCase(), hash]
    );

    await client.query("commit");
    console.log(`BD limpia lista. Admin: ${adminEmail}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
