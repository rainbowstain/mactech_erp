"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Barcode,
  Boxes,
  Edit3,
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
  notas: "",
  estado: 1,
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
const START_B = "11010010000";
const STOP = "1100011101011";

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

  return `${START_B}${body}${CODE_128[CODE_128_VALUES[checksum % 103]]}${STOP}`;
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
    notas: item.notas || "",
    estado: item.estado ?? 1,
  };
}

export default function InventoryModule({ area, title, initialItems, stats }) {
  const router = useRouter();
  const scannerRef = useRef(null);
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(() => ({ ...emptyItem, codigo_barra: makeBarcode(area) }));
  const [selectedIds, setSelectedIds] = useState([]);
  const [scanner, setScanner] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [queryText, setQueryText] = useState("");

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...emptyItem, codigo_barra: makeBarcode(area) });
    setMessage("");
  }

  function openEdit(item) {
    setEditing(item);
    setForm(toForm(item));
    setMessage("");
  }

  async function refreshItems(params = {}) {
    const search = params.search ?? queryText;
    const barcode = params.barcode ?? "";
    const response = await fetch(
      `/api/erp/inventario/items?area=${area}&q=${encodeURIComponent(search)}&barcode=${encodeURIComponent(barcode)}`
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "No se pudo cargar inventario.");
    setItems(payload.items || []);
    return payload.items || [];
  }

  async function handleSearch(event) {
    event.preventDefault();
    setMessage("");
    try {
      await refreshItems({ search: queryText });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleScan(event) {
    event.preventDefault();
    const code = scanner.trim();
    if (!code) return;

    setMessage("");
    try {
      const found = await refreshItems({ barcode: code, search: "" });
      if (found.length) {
        setSelectedIds([found[0].id]);
        openEdit(found[0]);
        setMessage(`Codigo encontrado: ${found[0].producto}`);
      } else {
        setEditing(null);
        setForm({ ...emptyItem, codigo_barra: code });
        setMessage("Codigo nuevo listo para asociar a un producto.");
      }
      setScanner("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const payload = {
      ...form,
      area,
      valor_original: Number(form.valor_original || 0),
      descuento: Number(form.descuento || 0),
      valor_venta: Number(form.valor_venta || 0),
      cantidad: Number(form.cantidad || 0),
      stock_minimo: Number(form.stock_minimo || 0),
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
      setMessage(editing ? "Producto actualizado." : "Producto creado.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function disableItem(item) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/erp/inventario/items/${item.id}`, { method: "DELETE" });
      const saved = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(saved.message || "No se pudo deshabilitar.");
      setItems((current) => current.map((row) => (row.id === saved.id ? saved : row)));
      setMessage("Producto deshabilitado.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function moveStock(item, tipo) {
    const amount = tipo === "salida" ? 1 : item.cantidad + 1;
    const payload = tipo === "ajuste" ? { tipo, cantidad: amount } : { tipo, cantidad: 1 };
    setSaving(true);
    setMessage("");
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
      setMessage(error.message);
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
            <label className="legacy-field">
              <span>Marca</span>
              <input value={form.marca} onChange={(event) => updateField("marca", event.target.value)} />
            </label>
            <label className="legacy-field inventory-field-wide">
              <span>Producto *</span>
              <input value={form.producto} onChange={(event) => updateField("producto", event.target.value)} required />
            </label>
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
              <span>Valor original</span>
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
              <span>Valor venta</span>
              <input
                inputMode="numeric"
                value={form.valor_venta}
                onChange={(event) => updateField("valor_venta", event.target.value.replace(/\D/g, ""))}
              />
            </label>
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
            {message ? <p className="maintainer-message">{message}</p> : null}
          </div>
        </form>

        <div className="inventory-table-tools no-print">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Buscar por marca, producto, codigo o ubicacion"
            />
            <button className="ghost-button compact-button" type="submit">
              Buscar
            </button>
          </form>
          <button className="ghost-button compact-button" type="button" onClick={() => refreshItems({ search: "" })}>
            <Boxes size={16} aria-hidden="true" />
            Ver todo
          </button>
        </div>

        <div className="table-wrap inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th className="text-center no-print">Etiqueta</th>
                <th>Codigo</th>
                <th>Producto</th>
                <th>Marca</th>
                <th className="text-center">Stock</th>
                <th>Valor venta</th>
                <th className="no-print">Ubicacion</th>
                <th className="text-center no-print">Estado</th>
                <th className="text-center no-print">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => {
                  const lowStock = Number(item.cantidad) <= Number(item.stock_minimo || 0);
                  return (
                    <tr key={item.id}>
                      <td className="text-center no-print">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelected(item.id)}
                        />
                      </td>
                      <td>
                        <strong>{item.codigo_barra}</strong>
                        <span className="subtext">{item.notas}</span>
                      </td>
                      <td>{textOrDash(item.producto)}</td>
                      <td>{textOrDash(item.marca)}</td>
                      <td className="text-center">
                        <span className={`pill ${lowStock ? "yellow" : "green"}`}>{item.cantidad}</span>
                      </td>
                      <td>{formatMoney(item.valor_venta)}</td>
                      <td className="no-print">{textOrDash(item.ubicacion)}</td>
                      <td className="text-center no-print">
                        <span className={`pill ${Number(item.estado) === 1 ? "green" : "gray"}`}>
                          {Number(item.estado) === 1 ? "Habilitado" : "Deshabilitado"}
                        </span>
                      </td>
                      <td className="text-center no-print">
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
                          <button className="action-button danger" type="button" title="Deshabilitar" onClick={() => disableItem(item)}>
                            <Trash2 size={15} aria-hidden="true" />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="empty-state">
                    Sin productos para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
