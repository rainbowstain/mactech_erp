import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { canManageUsers, createUser } from "@/lib/users";

export async function POST(request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!canManageUsers(session)) return NextResponse.json({ message: "Sin permiso para administrar usuarios." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  try {
    const user = await createUser(body);
    return NextResponse.json(user);
  } catch (error) {
    const status = error?.code === "23505" ? 409 : 400;
    return NextResponse.json({ message: error.message || "No se pudo crear usuario." }, { status });
  }
}
