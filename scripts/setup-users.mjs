import pg from "pg";

const { Client } = pg;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta configurado.");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  try {
    await client.query("alter table users add column if not exists role text not null default 'tecnico'");
    await client.query("alter table users add column if not exists updated_at timestamptz default now()");
    await client.query("alter table users drop constraint if exists users_role_check");
    await client.query(
      "alter table users add constraint users_role_check check (role in ('admin', 'finanzas', 'tecnico', 'ventas', 'developer'))"
    );
    await client.query("update users set role = 'admin', updated_at = now() where lower(email) = lower('admin@example.com')");
    await client.query("update users set role = 'tecnico' where role is null");
    console.log("Usuarios preparados: roles admin, finanzas, tecnico, ventas y developer.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
