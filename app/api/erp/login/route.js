import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  createSessionToken,
  findUserByEmail,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ message: "Ingresa email y password." }, { status: 400 });
  }

  const user = await findUserByEmail(email);

  if (!user || !user.estado) {
    return NextResponse.json({ message: "Usuario no existe o esta deshabilitado." }, { status: 401 });
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return NextResponse.json({ message: "Credenciales invalidas." }, { status: 401 });
  }

  const token = await createSessionToken(user);
  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
  });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
