import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { disableInventoryItem, updateInventoryItem } from "@/lib/inventory";

function asText(value) {
  return String(value || "").trim();
}

function asNullableText(value) {
  const text = asText(value);
  return text || null;
}

function asInt(value, fallback = 0) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : fallback;
}

function asDiscount(value) {
  if (value === null || value === undefined || value === "") return 0;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function asId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function cleanPayload(body) {
  return {
    marca: asNullableText(body.marca),
    producto: asNullableText(body.producto),
    codigo_barra: asText(body.codigo_barra),
    valor_original: asInt(body.valor_original, 0),
    descuento: asDiscount(body.descuento),
    valor_venta: asInt(body.valor_venta, 0),
    cantidad: asInt(body.cantidad, 0),
    stock_minimo: asInt(body.stock_minimo, 0),
    ubicacion: asNullableText(body.ubicacion),
    notas: asNullableText(body.notas),
    estado: asInt(body.estado, 1) ? 1 : 0,
  };
}

export async function PUT(request, { params }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = asId(rawId);
  if (!id) return NextResponse.json({ message: "ID invalido." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const payload = cleanPayload(body);
  if (!payload.producto || !payload.codigo_barra) {
    return NextResponse.json({ message: "Ingrese producto y codigo de barra." }, { status: 400 });
  }

  try {
    const item = await updateInventoryItem(id, payload);
    if (!item) return NextResponse.json({ message: "Producto no encontrado." }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    if (error?.code === "23505") {
      return NextResponse.json({ message: "El codigo de barra ya existe." }, { status: 409 });
    }
    throw error;
  }
}

export async function DELETE(_request, { params }) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { id: rawId } = await params;
  const id = asId(rawId);
  if (!id) return NextResponse.json({ message: "ID invalido." }, { status: 400 });

  const item = await disableInventoryItem(id);
  if (!item) return NextResponse.json({ message: "Producto no encontrado." }, { status: 404 });
  return NextResponse.json(item);
}
