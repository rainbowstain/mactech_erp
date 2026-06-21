export function getPostgresSslConfig(databaseUrl) {
  if (process.env.PGSSLMODE === "disable") return undefined;
  if (process.env.PGSSLMODE === "require") return { rejectUnauthorized: false };

  let hostname;
  try {
    hostname = new URL(databaseUrl).hostname;
  } catch {
    return undefined;
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  if (localHosts.has(hostname)) return undefined;

  if (hostname.endsWith(".supabase.co") || hostname.endsWith(".supabase.com")) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}
