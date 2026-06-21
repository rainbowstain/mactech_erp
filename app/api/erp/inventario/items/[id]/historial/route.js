import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { getPartUsageHistory } from "@/lib/orders";

export async function GET(_request, { params }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ message: "Identificador invalido." }, { status: 400 });
  }

  const history = await getPartUsageHistory(id);
  return NextResponse.json({ history });
}
