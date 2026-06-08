import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { query } from "@/lib/db";

export const SESSION_COOKIE = "mactech_erp_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no esta configurado");
  }
  return new TextEncoder().encode(secret);
}

export async function findUserByEmail(email) {
  const result = await query(
    "select id, name, email, role, estado, password from users where lower(email) = lower($1) limit 1",
    [email]
  );
  return result.rows[0] || null;
}

export async function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(getSecret());
}

export async function readSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const result = await query("select id, name, email, role, estado from users where id = $1 limit 1", [payload.id]);
    const user = result.rows[0];
    if (!user || !user.estado) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await readSession();
  if (!session) redirect("/erp/login");
  return session;
}
