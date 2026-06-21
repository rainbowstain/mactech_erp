import pg from "pg";
import { getPostgresSslConfig } from "../lib/postgres-ssl.js";

const tables = [
  "users",
  "clientes",
  "equipos",
  "dispositivos",
  "estados_ordenes",
  "servicios",
  "ordenes",
  "respuestas",
  "revisiones",
  "orden_has_servicios",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta configurado");
  }

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getPostgresSslConfig(process.env.DATABASE_URL),
  });

  await client.connect();
  try {
    for (const table of tables) {
      const { rows } = await client.query(`select count(*)::int as total from ${table}`);
      console.log(`${table}: ${rows[0].total}`);
    }

    const sample = await client.query(`
      select o.id, c.nombre as cliente, e.nombre as equipo, eo.nombre_estado as estado
      from ordenes o
      left join clientes c on c.id = o.cliente_id
      left join equipos e on e.id = o.id_equipo
      left join estados_ordenes eo on eo.id = o.estado
      order by o.id desc
      limit 1
    `);

    if (!sample.rows.length) {
      throw new Error("No hay ordenes migradas.");
    }

    console.log("OT muestra:", sample.rows[0]);
    console.log("Verificacion OK.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
