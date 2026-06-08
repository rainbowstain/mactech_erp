import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const schemaPath = path.join(root, "db", "schema.sql");

const tableSpecs = [
  ["users", ["id", "name", "email", "estado", "password"]],
  ["clientes", ["id", "nombre", "run", "mail", "fono", "estado"]],
  ["estados_ordenes", ["id", "nombre_estado"]],
  ["estado_equipos", ["id", "nombre"]],
  ["equipos", ["id", "nombre", "estado"]],
  ["dispositivos", ["id", "nombre", "modelo", "estado"]],
  ["servicios", ["id", "nombre", "precio", "estado"]],
  ["preguntas", ["id", "descripcion", "estado"]],
  [
    "ordenes",
    [
      "id",
      "fecha_entrega",
      "tecnico",
      "cliente_id",
      "fecha_salida",
      "imei",
      "metodopago",
      "codigo",
      "referencia_externa",
      "id_equipo",
      "id_dispositivo",
      "estado_dispositivo",
      "observacion",
      "estado",
      "total_recepcion",
      "subtotal",
      "iva",
      "descuento",
      "total",
      "id_ultima_garantia",
      "created_at",
    ],
    [
      "id",
      "fecha_entrega",
      "tecnico",
      "cliente_id",
      "fecha_salida",
      "imei",
      "`metodoPago` as metodopago",
      "codigo",
      "referencia_externa",
      "id_equipo",
      "id_dispositivo",
      "estado_dispositivo",
      "observacion",
      "estado",
      "total_recepcion",
      "subtotal",
      "iva",
      "descuento",
      "total",
      "id_ultima_garantia",
      "created_at",
    ],
  ],
  ["respuestas", ["id", "pregunta_id", "respuesta", "orden_id", "check_resp"]],
  ["revisiones", ["id", "orden_id", "responsable", "id_estado", "observacion", "garantia_id", "created_at"]],
  ["orden_has_servicios", ["id", "orden_id", "servicio_id", "responsable", "garantia_id", "created_at"]],
  ["garantias", ["id", "orden_id", "fecha", "subtotal", "iva", "descuento", "total"]],
];

function requiredEnv(name, fallback) {
  return process.env[name] || fallback;
}

function quotePg(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function copyTable(mysqlConnection, pgClient, table, targetColumns, sourceColumns = targetColumns) {
  try {
    const [rows] = await mysqlConnection.query(
      `select ${sourceColumns.join(", ")} from \`${table}\` order by id asc`
    );

    for (const row of rows) {
      const values = targetColumns.map((column) => {
        if (column === "imei" && row[column] !== null && row[column] !== undefined) return String(row[column]);
        if (column === "fono" && row[column] !== null && row[column] !== undefined) return String(row[column]);
        if (column === "estado" && table === "users") return Boolean(row[column]);
        return row[column];
      });
      const params = values.map((_, index) => `$${index + 1}`).join(", ");
      await pgClient.query(
        `insert into ${quotePg(table)} (${targetColumns.map(quotePg).join(", ")}) values (${params})`,
        values
      );
    }

    console.log(`Migrado ${table}: ${rows.length}`);
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.code === "ER_BAD_FIELD_ERROR") {
      console.warn(`Saltado ${table}: ${error.message}`);
      return;
    }
    throw error;
  }
}

async function resetIdentity(pgClient, table) {
  await pgClient.query(`
    select setval(
      pg_get_serial_sequence('${table}', 'id'),
      coalesce((select max(id) from ${quotePg(table)}), 1),
      (select count(*) > 0 from ${quotePg(table)})
    )
  `);
}

async function ensureLocalAdmin(pgClient) {
  const { rows } = await pgClient.query("select id from users where lower(email) = lower($1)", [
    "admin@example.com",
  ]);
  if (rows.length) return;

  const hash = await bcrypt.hash("admin123", 10);
  await pgClient.query(
    "insert into users (name, email, role, estado, password) values ($1, $2, 'admin', true, $3)",
    ["Admin Local", "admin@example.com", hash]
  );
  console.log("Creado admin local: admin@example.com / admin123");
}

async function main() {
  const schema = await fs.readFile(schemaPath, "utf8");
  const pgClient = new pg.Client({
    connectionString: requiredEnv("DATABASE_URL"),
    ssl: process.env.DATABASE_URL?.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
  const mysqlConnection = await mysql.createConnection({
    host: requiredEnv("MYSQL_HOST", "127.0.0.1"),
    port: Number(requiredEnv("MYSQL_PORT", "3307")),
    database: requiredEnv("MYSQL_DATABASE", "istylest_istyle_store"),
    user: requiredEnv("MYSQL_USER", "root"),
    password: requiredEnv("MYSQL_PASSWORD", "root"),
    dateStrings: false,
  });

  await pgClient.connect();
  try {
    await pgClient.query(schema);

    for (const spec of tableSpecs) {
      await copyTable(mysqlConnection, pgClient, spec[0], spec[1], spec[2]);
    }

    await ensureLocalAdmin(pgClient);
    await pgClient.query("update users set role = 'admin' where lower(email) = lower('admin@example.com')");

    for (const [table] of tableSpecs) {
      await resetIdentity(pgClient, table);
    }

    console.log("Migracion local completada.");
  } finally {
    await mysqlConnection.end();
    await pgClient.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
