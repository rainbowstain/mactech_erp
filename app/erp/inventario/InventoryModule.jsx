"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Boxes,
  Edit3,
  History,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { formatMoney, textOrDash } from "@/lib/format";
import { notifyInfo, notifySuccess, notifyWarning } from "@/lib/notify";
import DataTable from "../DataTable";

const emptyItem = {
  marca: "",
  producto: "",
  codigo_barra: "",
  valor_original: 0,
  descuento: 0,
  valor_venta: 0,
  cantidad: 0,
  stock_minimo: 0,
  ubicacion: "",
  proveedor: "",
  notas: "",
  estado: 1,
  marca_id: "",
  dispositivo_id: "",
  repuesto_id: "",
  tipo_repuesto: "",
};

const CODE_128 = {
  " ": "11011001100",
  "!": "11001101100",
  "\"": "11001100110",
  "#": "10010011000",
  $: "10010001100",
  "%": "10001001100",
  "&": "10011001000",
  "'": "10011000100",
  "(": "10001100100",
  ")": "11001001000",
  "*": "11001000100",
  "+": "11000100100",
  ",": "10110011100",
  "-": "10011011100",
  ".": "10011001110",
  "/": "10111001100",
  0: "10011101100",
  1: "10011100110",
  2: "11001110010",
  3: "11001011100",
  4: "11001001110",
  5: "11011100100",
  6: "11001110100",
  7: "11101101110",
  8: "11101001100",
  9: "11100101100",
  ":": "11100100110",
  ";": "11101100100",
  "<": "11100110100",
  "=": "11100110010",
  ">": "11011011000",
  "?": "11011000110",
  "@": "11000110110",
  A: "10100011000",
  B: "10001011000",
  C: "10001000110",
  D: "10110001000",
  E: "10001101000",
  F: "10001100010",
  G: "11010001000",
  H: "11000101000",
  I: "11000100010",
  J: "10110111000",
  K: "10110001110",
  L: "10001101110",
  M: "10111011000",
  N: "10111000110",
  O: "10001110110",
  P: "11101110110",
  Q: "11010001110",
  R: "11000101110",
  S: "11011101000",
  T: "11011100010",
  U: "11011101110",
  V: "11101011000",
  W: "11101000110",
  X: "11100010110",
  Y: "11101101000",
  Z: "11101100010",
  "[": "11100011010",
  "\\": "11101111010",
  "]": "11001000010",
  "^": "11110001010",
  _: "10100110000",
  "`": "10100001100",
  a: "10010110000",
  b: "10010000110",
  c: "10000101100",
  d: "10000100110",
  e: "10110010000",
  f: "10110000100",
  g: "10011010000",
  h: "10011000010",
  i: "10000110100",
  j: "10000110010",
  k: "11000010010",
  l: "11001010000",
  m: "11110111010",
  n: "11000010100",
  o: "10001111010",
  p: "10100111100",
  q: "10010111100",
  r: "10010011110",
  s: "10111100100",
  t: "10011110100",
  u: "10011110010",
  v: "11110100100",
  w: "11110010100",
  x: "11110010010",
  y: "11011011110",
  z: "11011110110",
  "{": "11110110110",
  "|": "10101111000",
  "}": "10100011110",
  "~": "10001011110",
};

const CODE_128_VALUES = Array.from({ length: 95 }, (_, index) => String.fromCharCode(index + 32));
// Patrones para los valores 95-102 (sin caracter ASCII imprimible); solo pueden
// aparecer como digito verificador, nunca en el cuerpo del codigo.
const CODE_128_HIGH = [
  "10111101000",
  "10111100010",
  "11110101000",
  "11110100010",
  "10111011110",
  "10111101110",
  "11101011110",
  "11110101110",
];
const START_B = "11010010000";
const STOP = "1100011101011";

function code128PatternForValue(value) {
  if (value < 95) return CODE_128[CODE_128_VALUES[value]];
  return CODE_128_HIGH[value - 95] || "";
}

function makeBarcode(area) {
  const prefix = area === "taller" ? "MTT" : "MTP";
  const time = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prefix}${time}${random}`;
}

function code128Pattern(value) {
  const text = String(value || "").replace(/[^\x20-\x7E]/g, "");
  let checksum = 104;
  let body = "";

  [...text].forEach((char, index) => {
    const valueIndex = CODE_128_VALUES.indexOf(char);
    const safeIndex = valueIndex >= 0 ? valueIndex : CODE_128_VALUES.indexOf(" ");
    checksum += safeIndex * (index + 1);
    body += CODE_128[CODE_128_VALUES[safeIndex]];
  });

  return `${START_B}${body}${code128PatternForValue(checksum % 103)}${STOP}`;
}

function BarcodeSvg({ value }) {
  const pattern = code128Pattern(value);
  const width = pattern.length;
  return (
    <svg className="barcode-svg" viewBox={`0 0 ${width} 42`} preserveAspectRatio="none" aria-label={value}>
      {pattern.split("").map((bit, index) =>
        bit === "1" ? <rect key={`${value}-${index}`} x={index} y="0" width="1" height="42" /> : null
      )}
    </svg>
  );
}

function toForm(item) {
  if (!item) return { ...emptyItem };
  return {
    marca: item.marca || "",
    producto: item.producto || "",
    codigo_barra: item.codigo_barra || "",
    valor_original: item.valor_original || 0,
    descuento: item.descuento || 0,
    valor_venta: item.valor_venta || 0,
    cantidad: item.cantidad || 0,
    stock_minimo: item.stock_minimo || 0,
    ubicacion: item.ubicacion || "",
    proveedor: item.proveedor || "",
    notas: item.notas || "",
    estado: item.estado ?? 1,
    marca_id: item.equipo_id || "",
    dispositivo_id: item.dispositivo_id || "",
    repuesto_id: item.repuesto_id || "",
    tipo_repuesto: item.tipo_repuesto || item.notas || "",
  };
}

function uniqueOptions(rows, getValue) {
  return Array.from(
    new Set(rows.map(getValue).map((value) => String(value || "").trim()).filter(Boolean))
  )
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((value) => ({ value, label: value }));
}

export default function InventoryModule({
  area,
  title,
  initialItems,
  initialTotal = 0,
  pageSize: initialPageSize = 50,
  stats,
  brands = [],
  devices = [],
  parts = [],
  providers = [],
}) {
  const router = useRouter();
  const scannerRef = useRef(null);
  const serverMode = area === "taller";
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => ({ ...emptyItem, codigo_barra: makeBarcode(area) }));
  const [selectedIds, setSelectedIds] = useState([]);
  const [scanner, setScanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [queryText, setQueryText] = useState("");
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [serverFilters, setServerFilters] = useState({});
  const [historyItem, setHistoryItem] = useState(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );
  const filteredDevices = useMemo(() => {
    if (area !== "taller") return devices;
    if (!form.marca_id) return [];
    return devices.filter((device) => String(device.modelo) === String(form.marca_id));
  }, [area, devices, form.marca_id]);
  const tableFilterOptions = useMemo(
    () => ({
      modelos: uniqueOptions(items, (item) =>
        item.dispositivo_nombre ? `${item.equipo_nombre || ""} ${item.dispositivo_nombre}`.trim() : "Generico"
      ),
      repuestos: uniqueOptions(items, (item) => item.repuesto_nombre),
      marcas: uniqueOptions(items, (item) => item.marca),
      proveedores: uniqueOptions(items, (item) => item.proveedor),
      ubicaciones: uniqueOptions(items, (item) => item.ubicacion),
    }),
    [items]
  );
  // En modo servidor las opciones vienen del catalogo completo, no de la pagina cargada.
  const brandOptions = useMemo(
    () => brands.map((brand) => ({ value: String(brand.id), label: brand.nombre })),
    [brands]
  );
  const partOptions = useMemo(
    () => parts.map((part) => ({ value: String(part.id), label: part.nombre })),
    [parts]
  );
  const providerOptions = useMemo(
    () => providers.map((provider) => ({ value: provider, label: provider })),
    [providers]
  );
  const estadoOptions = [
    { value: "1", label: "Habilitado" },
    { value: "0", label: "Deshabilitado" },
  ];
  const workshopProfit = Math.max(0, Number(form.valor_venta || 0) - Number(form.valor_original || 0));
  const workshopMargin =
    Number(form.valor_original || 0) > 0 ? Math.round((workshopProfit / Number(form.valor_original || 0)) * 100) : 0;

  function composeWorkshopName(nextForm) {
    const brand = brands.find((item) => String(item.id) === String(nextForm.marca_id));
    const device = devices.find((item) => String(item.id) === String(nextForm.dispositivo_id));
    const part = parts.find((item) => String(item.id) === String(nextForm.repuesto_id));
    return [brand?.nombre, device?.nombre, part?.nombre, nextForm.tipo_repuesto].filter(Boolean).join(" ");
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateWorkshopField(key, value) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "marca_id") {
        const brand = brands.find((item) => String(item.id) === String(value));
        next.marca = brand?.nombre || "";
        next.dispositivo_id = "";
      }
      if (key === "repuesto_id") {
        next.tipo_repuesto = "";
      }
      next.producto = composeWorkshopName(next);
      return next;
    });
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyItem, codigo_barra: makeBarcode(area) });
  }

  function openEdit(item) {
    setEditing(item);
    setForm(toForm(item));
  }

  async function refreshItems(overrides = {}) {
    const search = overrides.search ?? queryText;
    const barcode = overrides.barcode ?? "";
    const filters = overrides.filters ?? serverFilters;
    const nextPage = overrides.page ?? page;
    const nextPageSize = overrides.pageSize ?? pageSize;

    const params = new URLSearchParams({ area });
    if (search) params.set("q", search);
    if (barcode) params.set("barcode", barcode);
    if (serverMode) {
      if (filters.marca) params.set("equipoId", filters.marca);
      if (filters.repuesto_nombre) params.set("repuestoId", filters.repuesto_nombre);
      if (filters.proveedor) params.set("proveedor", filters.proveedor);
      if (filters.estado) params.set("estado", filters.estado);
      params.set("page", String(nextPage));
      params.set("pageSize", String(nextPageSize));
    } else {
      params.set("pageSize", "500");
    }

    const response = await fetch(`/api/erp/inventario/items?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "No se pudo cargar inventario.");
    setItems(payload.items || []);
    if (serverMode) {
      setTotal(payload.total || 0);
      setPage(payload.page || nextPage);
    }
    return payload.items || [];
  }

  async function handleSearch(event) {
    event.preventDefault();
    try {
      await refreshItems({ search: queryText, page: 1 });
    } catch (error) {
      notifyWarning(error.message);
    }
  }

  function handleServerFilter(key, value) {
    const next = { ...serverFilters, [key]: value };
    setServerFilters(next);
    refreshItems({ filters: next, page: 1 }).catch((error) => notifyWarning(error.message));
  }

  function handlePageChange(next) {
    refreshItems({ page: next }).catch((error) => notifyWarning(error.message));
  }

  function handlePageSizeChange(next) {
    setPageSize(next);
    refreshItems({ page: 1, pageSize: next }).catch((error) => notifyWarning(error.message));
  }

  function handleShowAll() {
    setQueryText("");
    setServerFilters({});
    refreshItems({ search: "", filters: {}, page: 1 }).catch((error) => notifyWarning(error.message));
  }

  async function openHistory(item) {
    setHistoryItem(item);
    setHistoryRows([]);
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/erp/inventario/items/${item.id}/historial`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo cargar el historial.");
      setHistoryRows(payload.history || []);
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  function closeHistory() {
    setHistoryItem(null);
    setHistoryRows([]);
  }

  async function handleScan(event) {
    event.preventDefault();
    const code = scanner.trim();
    if (!code) return;

    try {
      const found = await refreshItems({ barcode: code, search: "" });
      if (found.length) {
        setSelectedIds([found[0].id]);
        openEdit(found[0]);
        notifySuccess(`Codigo encontrado: ${found[0].producto}`);
      } else {
        setEditing(null);
        setForm({ ...emptyItem, codigo_barra: code });
        notifyInfo("Codigo nuevo listo para asociar a un producto.");
      }
      setScanner("");
    } catch (error) {
      notifyWarning(error.message);
    }
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      ...form,
      area,
      producto: area === "taller" ? composeWorkshopName(form) || form.producto : form.producto,
      valor_original: Number(form.valor_original || 0),
      descuento: Number(form.descuento || 0),
      valor_venta: Number(form.valor_venta || 0),
      cantidad: Number(form.cantidad || 0),
      stock_minimo: Number(form.stock_minimo || 0),
      proveedor: form.proveedor,
      notas: area === "taller" ? form.tipo_repuesto : form.notas,
      estado: Number(form.estado || 0),
    };

    try {
      const endpoint = editing ? `/api/erp/inventario/items/${editing.id}` : "/api/erp/inventario/items";
      const response = await fetch(endpoint, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.message || "No se pudo guardar.");

      setItems((current) => {
        const next = editing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current];
        return next.sort((a, b) => String(a.producto).localeCompare(String(b.producto)));
      });
      setSelectedIds([saved.id]);
      setEditing(saved);
      setForm(toForm(saved));
      notifySuccess(editing ? "Producto actualizado." : "Producto creado.");
      router.refresh();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleItemStatus(item) {
    const nextEstado = Number(item.estado) === 1 ? 0 : 1;
    setSaving(true);
    try {
      const response = await fetch(`/api/erp/inventario/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nextEstado }),
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.message || "No se pudo actualizar el estado.");
      setItems((current) => current.map((row) => (row.id === saved.id ? saved : row)));
      notifySuccess(nextEstado ? "Producto reactivado." : "Producto deshabilitado.");
      router.refresh();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function moveStock(item, tipo) {
    if (tipo === "salida" && Number(item.cantidad) <= 0) {
      notifyWarning("El producto no tiene stock para descontar.");
      return;
    }
    const payload = { tipo, cantidad: 1 };
    setSaving(true);
    try {
      const response = await fetch(`/api/erp/inventario/items/${item.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.message || "No se pudo mover stock.");
      setItems((current) => current.map((row) => (row.id === saved.id ? saved : row)));
      if (editing?.id === saved.id) setForm(toForm(saved));
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  function toggleSelected(id) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  }

  function printLabels() {
    window.print();
  }

  return (
    <div className="inventory-page">
      <section className="grid-cards inventory-stats">
        <div className="stat">
          <span>Items</span>
          <strong>{stats.items}</strong>
        </div>
        <div className="stat">
          <span>Unidades</span>
          <strong>{stats.unidades}</strong>
        </div>
        <div className="stat">
          <span>Bajo stock</span>
          <strong>{stats.bajo_stock}</strong>
        </div>
        <div className="stat">
          <span>Valorizado</span>
          <strong>{formatMoney(stats.valorizado)}</strong>
        </div>
      </section>

      <section className="panel legacy-block inventory-workspace">
        <div className="panel-header panel-header-wrap">
          <h2>{title}</h2>
          <div className="inventory-toolbar no-print">
            <form className="inventory-scan-form" onSubmit={handleScan}>
              <Barcode size={17} aria-hidden="true" />
              <input
                ref={scannerRef}
                value={scanner}
                onChange={(event) => setScanner(event.target.value)}
                placeholder="Escanear codigo"
                autoComplete="off"
              />
              <button className="ghost-button compact-button" type="submit">
                Usar
              </button>
            </form>
            <button className="ghost-button compact-button" type="button" onClick={() => scannerRef.current?.focus()}>
              <Search size={16} aria-hidden="true" />
              Foco scanner
            </button>
          </div>
        </div>

        <form className="inventory-form no-print" onSubmit={saveItem}>
          <div className="maintainer-form-heading">
            <strong>{editing ? "Editar producto" : "Crear producto"}</strong>
            {editing ? <span>#{editing.id}</span> : null}
          </div>
          <div className="inventory-form-grid">
            {area === "taller" ? (
              <>
                <label className="legacy-field">
                  <span>Marca *</span>
                  <select value={form.marca_id} onChange={(event) => updateWorkshopField("marca_id", event.target.value)} required>
                    <option value="">Seleccione</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="legacy-field">
                  <span>Modelo *</span>
                  <select
                    value={form.dispositivo_id}
                    onChange={(event) => updateWorkshopField("dispositivo_id", event.target.value)}
                    required
                  >
                    <option value="">Seleccione</option>
                    {filteredDevices.map((device) => (
                      <option key={device.id} value={device.id}>
                        {device.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="legacy-field">
                  <span>Reparacion *</span>
                  <select value={form.repuesto_id} onChange={(event) => updateWorkshopField("repuesto_id", event.target.value)} required>
                    <option value="">Seleccione</option>
                    {parts.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.nombre}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="legacy-field">
                  <span>Tipo especifico *</span>
                  <input
                    value={form.tipo_repuesto}
                    onChange={(event) => updateWorkshopField("tipo_repuesto", event.target.value)}
                    placeholder="OLED, Soft OLED, Original..."
                    required
                  />
                </label>
                <label className="legacy-field inventory-field-wide">
                  <span>Nombre final</span>
                  <input value={composeWorkshopName(form) || form.producto} readOnly />
                </label>
              </>
            ) : (
              <>
                <label className="legacy-field">
                  <span>Marca</span>
                  <input value={form.marca} onChange={(event) => updateField("marca", event.target.value)} />
                </label>
                <label className="legacy-field inventory-field-wide">
                  <span>Producto *</span>
                  <input value={form.producto} onChange={(event) => updateField("producto", event.target.value)} required />
                </label>
              </>
            )}
            <label className="legacy-field">
              <span>Codigo de barra *</span>
              <div className="legacy-input-button compact">
                <input
                  value={form.codigo_barra}
                  onChange={(event) => updateField("codigo_barra", event.target.value)}
                  required
                />
                <button
                  className="legacy-plus"
                  type="button"
                  title="Generar codigo"
                  onClick={() => updateField("codigo_barra", makeBarcode(area))}
                >
                  <RefreshCw size={16} aria-hidden="true" />
                </button>
              </div>
            </label>
            <label className="legacy-field">
              <span>{area === "taller" ? "Costo Mactech" : "Valor original"}</span>
              <input
                inputMode="numeric"
                value={form.valor_original}
                onChange={(event) => updateField("valor_original", event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="legacy-field">
              <span>Descuento</span>
              <input
                inputMode="decimal"
                value={form.descuento}
                onChange={(event) => updateField("descuento", event.target.value.replace(/[^0-9.,]/g, ""))}
              />
            </label>
            <label className="legacy-field">
              <span>{area === "taller" ? "Precio referencia" : "Valor venta"}</span>
              <input
                inputMode="numeric"
                value={form.valor_venta}
                onChange={(event) => updateField("valor_venta", event.target.value.replace(/\D/g, ""))}
              />
            </label>
            {area === "taller" ? (
              <label className="legacy-field">
                <span>Ganancia</span>
                <input value={`${formatMoney(workshopProfit)} (${workshopMargin}%)`} readOnly />
              </label>
            ) : null}
            <label className="legacy-field">
              <span>Cantidad</span>
              <input
                inputMode="numeric"
                value={form.cantidad}
                onChange={(event) => updateField("cantidad", event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="legacy-field">
              <span>Stock minimo</span>
              <input
                inputMode="numeric"
                value={form.stock_minimo}
                onChange={(event) => updateField("stock_minimo", event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <label className="legacy-field">
              <span>Proveedor</span>
              <input value={form.proveedor} onChange={(event) => updateField("proveedor", event.target.value)} />
            </label>
            <label className="legacy-field">
              <span>Ubicacion</span>
              <input value={form.ubicacion} onChange={(event) => updateField("ubicacion", event.target.value)} />
            </label>
            <label className="legacy-field">
              <span>Estado</span>
              <select value={form.estado} onChange={(event) => updateField("estado", event.target.value)}>
                <option value={1}>Habilitado</option>
                <option value={0}>Deshabilitado</option>
              </select>
            </label>
            <label className="legacy-field inventory-field-wide">
              <span>Notas</span>
              <input value={form.notas} onChange={(event) => updateField("notas", event.target.value)} />
            </label>
          </div>
          <div className="maintainer-actions">
            <button className="primary-button compact-button inline-primary" type="submit" disabled={saving}>
              <Save size={16} aria-hidden="true" />
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button className="ghost-button compact-button" type="button" onClick={resetForm} disabled={saving}>
              <X size={16} aria-hidden="true" />
              Limpiar
            </button>
            {selectedItems.length ? (
              <button className="ghost-button compact-button" type="button" onClick={printLabels}>
                <Printer size={16} aria-hidden="true" />
                Imprimir etiquetas ({selectedItems.length})
              </button>
            ) : null}
          </div>
        </form>

        <div className="inventory-table-tools no-print">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Buscar por marca, producto, codigo, proveedor o ubicacion"
            />
            <button className="ghost-button compact-button" type="submit">
              Buscar
            </button>
          </form>
          <button className="ghost-button compact-button" type="button" onClick={handleShowAll}>
            <Boxes size={16} aria-hidden="true" />
            Ver todo
          </button>
        </div>

        <DataTable
          rows={items}
          emptyMessage="Sin productos para mostrar."
          server={serverMode}
          total={total}
          filters={serverFilters}
          onFilterChange={handleServerFilter}
          page={page}
          onPageChange={handlePageChange}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          columns={[
            {
              key: "label",
              label: "Etiqueta",
              align: "center",
              filter: false,
              render: (item) => (
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} />
              ),
            },
            {
              key: "codigo_barra",
              label: "Codigo",
              render: (item) => (
                <>
                  <strong>{item.codigo_barra}</strong>
                  <span className="subtext">{item.notas}</span>
                </>
              ),
            },
            { key: "producto", label: area === "taller" ? "Repuesto" : "Producto" },
            ...(area === "taller"
              ? [
                  {
                    key: "modelo",
                    label: "Modelo",
                    filter: serverMode ? false : undefined,
                    filterOptions: tableFilterOptions.modelos,
                    value: (item) =>
                      item.dispositivo_nombre ? `${item.equipo_nombre || ""} ${item.dispositivo_nombre}`.trim() : "Generico",
                    render: (item) =>
                      item.dispositivo_nombre ? `${item.equipo_nombre || ""} ${item.dispositivo_nombre}`.trim() : "Generico",
                  },
                  {
                    key: "repuesto_nombre",
                    label: "Tipo",
                    filterOptions: serverMode ? partOptions : tableFilterOptions.repuestos,
                    value: (item) => item.repuesto_nombre || "",
                    render: (item) => textOrDash(item.repuesto_nombre),
                  },
                ]
              : []),
            { key: "marca", label: "Marca", filterOptions: serverMode ? brandOptions : tableFilterOptions.marcas },
            {
              key: "cantidad",
              label: "Stock",
              align: "center",
              render: (item) => {
                const lowStock = Number(item.cantidad) <= Number(item.stock_minimo || 0);
                return <span className={`pill ${lowStock ? "yellow" : "green"}`}>{item.cantidad}</span>;
              },
            },
            {
              key: "valor_venta",
              label: area === "taller" ? "Ultimo precio" : "Valor venta",
              value: (item) => formatMoney(area === "taller" ? item.ultimo_precio_venta || item.valor_venta : item.valor_venta),
              render: (item) =>
                area === "taller" ? (
                  <>
                    <strong>{formatMoney(item.ultimo_precio_venta || item.valor_venta)}</strong>
                    {item.ultimo_precio_venta ? (
                      <span className="subtext">cobrado</span>
                    ) : (
                      <span className="subtext">referencia</span>
                    )}
                  </>
                ) : (
                  formatMoney(item.valor_venta)
                ),
            },
            {
              key: "proveedor",
              label: "Proveedor",
              filterOptions: serverMode ? providerOptions : tableFilterOptions.proveedores,
              render: (item) => textOrDash(item.proveedor),
            },
            {
              key: "ubicacion",
              label: "Ubicacion",
              filter: serverMode ? false : undefined,
              filterOptions: tableFilterOptions.ubicaciones,
            },
            {
              key: "estado",
              label: "Estado",
              align: "center",
              value: (item) => (Number(item.estado) === 1 ? "Habilitado" : "Deshabilitado"),
              filterOptions: serverMode
                ? estadoOptions
                : [
                    { value: "Habilitado", label: "Habilitado" },
                    { value: "Deshabilitado", label: "Deshabilitado" },
                  ],
              render: (item) => (
                <span className={`pill ${Number(item.estado) === 1 ? "green" : "gray"}`}>
                  {Number(item.estado) === 1 ? "Habilitado" : "Deshabilitado"}
                </span>
              ),
            },
            {
              key: "actions",
              label: "Acciones",
              align: "right",
              filter: false,
              render: (item) => (
                <span className="action-group">
                  <button className="action-button" type="button" title="Entrada" onClick={() => moveStock(item, "entrada")}>
                    <Plus size={15} aria-hidden="true" />
                  </button>
                  <button className="action-button" type="button" title="Salida" onClick={() => moveStock(item, "salida")}>
                    <Minus size={15} aria-hidden="true" />
                  </button>
                  <button className="action-button" type="button" title="Editar" onClick={() => openEdit(item)}>
                    <Edit3 size={15} aria-hidden="true" />
                  </button>
                  {area === "taller" ? (
                    <button className="action-button" type="button" title="Historial de uso" onClick={() => openHistory(item)}>
                      <History size={15} aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    className={`action-button ${Number(item.estado) === 1 ? "danger" : ""}`}
                    type="button"
                    title={Number(item.estado) === 1 ? "Deshabilitar" : "Reactivar"}
                    onClick={() => toggleItemStatus(item)}
                  >
                    {Number(item.estado) === 1 ? (
                      <Trash2 size={15} aria-hidden="true" />
                    ) : (
                      <RefreshCw size={15} aria-hidden="true" />
                    )}
                  </button>
                </span>
              ),
            },
          ]}
        />
      </section>

      <section className="inventory-labels print-only">
        {(selectedItems.length ? selectedItems : editing ? [editing] : []).map((item) => (
          <article className="inventory-label" key={item.id}>
            <strong>{item.producto}</strong>
            <span>{textOrDash(item.marca)}</span>
            <BarcodeSvg value={item.codigo_barra} />
            <small>{item.codigo_barra}</small>
            <b>{formatMoney(item.valor_venta)}</b>
          </article>
        ))}
      </section>

      {historyItem ? (
        <div className="modal-backdrop no-print" role="dialog" aria-modal="true" onClick={closeHistory}>
          <div className="modal-card inventory-history" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header panel-header-wrap">
              <h2>Historial de uso</h2>
              <button className="ghost-button compact-button" type="button" onClick={closeHistory}>
                <X size={16} aria-hidden="true" />
                Cerrar
              </button>
            </div>
            <p className="subtext">{historyItem.producto}</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>OT</th>
                    <th>Cliente</th>
                    <th>Cant.</th>
                    <th>Precio cobrado</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td className="empty-state" colSpan={5}>
                        Cargando...
                      </td>
                    </tr>
                  ) : historyRows.length ? (
                    historyRows.map((row) => (
                      <tr key={row.id}>
                        <td>#{row.orden_id}</td>
                        <td>{textOrDash(row.cliente_nombre)}</td>
                        <td className="text-center">{row.cantidad}</td>
                        <td>{formatMoney(row.precio_unitario)}</td>
                        <td>{row.created_at ? new Date(row.created_at).toLocaleDateString("es-CL") : "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="empty-state" colSpan={5}>
                        Este repuesto aun no se ha usado en ninguna orden.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
