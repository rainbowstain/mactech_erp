import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { canManageUsers, disableUser, updateUser } from "@/lib/users";

function asId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getId(params) {
  const { id } = await params;
  return asId(id);
}

export async function PUT(request, { params }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!canManageUsers(session)) return NextResponse.json({ message: "Sin permiso para administrar usuarios." }, { status: 403 });

  const id = await getId(params);
  if (!id) return NextResponse.json({ message: "ID invalido." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  try {
    const user = await updateUser(id, body);
    return NextResponse.json(user);
  } catch (error) {
    const status = error?.code === "23505" ? 409 : error.message === "Usuario no encontrado." ? 404 : 400;
    return NextResponse.json({ message: error.message || "No se pudo actualizar usuario." }, { status });
  }
}

export async function DELETE(_request, { params }) {
  const session = await readSession();
  if (!session) return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  if (!canManageUsers(session)) return NextResponse.json({ message: "Sin permiso para administrar usuarios." }, { status: 403 });

  const id = await getId(params);
  if (!id) return NextResponse.json({ message: "ID invalido." }, { status: 400 });

  try {
    const user = await disableUser(id);
    return NextResponse.json(user);
  } catch (error) {
    const status = error.message === "Usuario no encontrado." ? 404 : 400;
    return NextResponse.json({ message: error.message || "No se pudo deshabilitar usuario." }, { status });
  }
}
