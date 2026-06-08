import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { createInventoryItem, getInventoryItems, makeBarcode, normalizeArea } from "@/lib/inventory";

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

function cleanPayload(body) {
  const area = normalizeArea(body.area);
  return {
    area,
    marca: asNullableText(body.marca),
    producto: asNullableText(body.producto),
    codigo_barra: asText(body.codigo_barra) || makeBarcode(area),
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

export async function GET(request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const items = await getInventoryItems({
    area: searchParams.get("area") || "productos",
    search: searchParams.get("q") || "",
    barcode: searchParams.get("barcode") || "",
  });

  return NextResponse.json({ items });
}

export async function POST(request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ message: "No autorizado." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const payload = cleanPayload(body);
  if (!payload.producto) {
    return NextResponse.json({ message: "Ingrese el nombre del producto." }, { status: 400 });
  }

  try {
    const item = await createInventoryItem(payload);
    return NextResponse.json(item);
  } catch (error) {
    if (error?.code === "23505") {
      return NextResponse.json({ message: "El codigo de barra ya existe." }, { status: 409 });
    }
    throw error;
  }
}
