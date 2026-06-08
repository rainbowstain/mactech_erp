"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Barcode, Minus, Plus, Printer, Save, Search, ShoppingCart, Trash2 } from "lucide-react";
import { formatMoney, textOrDash } from "@/lib/format";

const PAYMENT_METHODS = ["EFECTIVO", "TRANSFERENCIA", "DEBITO", "CREDITO", "REDBANK", "OTRO"];

function toInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : fallback;
}

export default function ProductSalesModule({ initialItems, recentSales }) {
  const router = useRouter();
  const scanRef = useRef(null);
  const [items, setItems] = useState(initialItems);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [scan, setScan] = useState("");
  const [metodoPago, setMetodoPago] = useState("EFECTIVO");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const totals = useMemo(
    () =>
      cart.reduce(
        (acc, row) => ({
          total: acc.total + row.cantidad * row.precio_unitario,
          costo: acc.costo + row.cantidad * row.costo_unitario,
        }),
        { total: 0, costo: 0 }
      ),
    [cart]
  );

  async function refreshItems({ q = search, barcode = "" } = {}) {
    const response = await fetch(
      `/api/erp/inventario/items?area=productos&q=${encodeURIComponent(q)}&barcode=${encodeURIComponent(barcode)}`
    );
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "No se pudo buscar productos.");
    setItems(payload.items || []);
    return payload.items || [];
  }

  async function handleSearch(event) {
    event.preventDefault();
    setMessage("");
    try {
      await refreshItems({ q: search });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleScan(event) {
    event.preventDefault();
    const code = scan.trim();
    if (!code) return;
    setMessage("");
    try {
      const found = await refreshItems({ q: "", barcode: code });
      if (found[0]) addToCart(found[0]);
      else setMessage("Codigo no encontrado en inventario productos.");
      setScan("");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function addToCart(item) {
    if (Number(item.estado) !== 1) {
      setMessage("Producto deshabilitado.");
      return;
    }
    if (Number(item.cantidad) <= 0) {
      setMessage("Producto sin stock disponible.");
      return;
    }
    setCart((current) => {
      const existing = current.find((row) => row.id === item.id);
      if (existing) {
        return current.map((row) =>
          row.id === item.id ? { ...row, cantidad: Math.min(row.cantidad + 1, Number(item.cantidad)) } : row
        );
      }
      return [
        ...current,
        {
          id: item.id,
          producto: item.producto,
          marca: item.marca,
          stock: Number(item.cantidad),
          cantidad: 1,
          precio_unitario: toInt(item.valor_venta),
          costo_unitario: toInt(item.valor_original),
        },
      ];
    });
  }

  function updateCart(id, patch) {
    setCart((current) =>
      current.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        next.cantidad = Math.min(Math.max(1, toInt(next.cantidad, 1)), row.stock);
        next.precio_unitario = toInt(next.precio_unitario);
        return next;
      })
    );
  }

  async function saveSale(event) {
    event.preventDefault();
    if (!cart.length) {
      setMessage("Agrega productos al carrito.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/erp/ventas/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metodo_pago: metodoPago,
          notas: notes,
          items: cart.map((row) => ({
            inventario_item_id: row.id,
            cantidad: row.cantidad,
            precio_unitario: row.precio_unitario,
          })),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo registrar la venta.");
      setCart([]);
      setNotes("");
      setMessage(`Venta registrada: ${formatMoney(payload.total_bruto)}. Preparando boleta...`);
      router.push(`/erp/ventas/${payload.id}/boleta`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sales-page">
      <section className="legacy-block">
        <div className="legacy-block-header">
          <h2>Venta de Productos</h2>
          <button className="ghost-button compact-button" type="button" onClick={() => scanRef.current?.focus()}>
            <Barcode size={16} aria-hidden="true" />
            Foco scanner
          </button>
        </div>
        <div className="sales-layout">
          <div className="sales-products-panel">
            <form className="sales-toolbar" onSubmit={handleScan}>
              <Barcode size={17} aria-hidden="true" />
              <input
                ref={scanRef}
                value={scan}
                onChange={(event) => setScan(event.target.value)}
                placeholder="Escanear codigo"
                autoComplete="off"
              />
              <button className="ghost-button compact-button" type="submit">Usar</button>
            </form>
            <form className="search-form sales-search" onSubmit={handleSearch}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto, marca o codigo"
              />
              <button className="ghost-button compact-button" type="submit">
                <Search size={16} aria-hidden="true" />
                Buscar
              </button>
            </form>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Marca</th>
                    <th className="text-center">Stock</th>
                    <th>Precio</th>
                    <th className="text-center">Agregar</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.producto}</strong>
                        <span className="subtext">{item.codigo_barra}</span>
                      </td>
                      <td>{textOrDash(item.marca)}</td>
                      <td className="text-center">
                        <span className={`pill ${Number(item.cantidad) <= Number(item.stock_minimo || 0) ? "yellow" : "green"}`}>
                          {item.cantidad}
                        </span>
                      </td>
                      <td>{formatMoney(item.valor_venta)}</td>
                      <td className="text-center">
                        <button className="action-button" type="button" onClick={() => addToCart(item)}>
                          <Plus size={15} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!items.length ? (
                    <tr><td colSpan="5" className="empty-state">Sin productos para mostrar.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <form className="sales-cart-panel" onSubmit={saveSale}>
            <div className="sales-cart-title">
              <ShoppingCart size={18} aria-hidden="true" />
              <strong>Carrito</strong>
            </div>
            <div className="sales-cart-list">
              {cart.map((row) => (
                <div className="sales-cart-row" key={row.id}>
                  <div>
                    <strong>{row.producto}</strong>
                    <span>{textOrDash(row.marca)}</span>
                  </div>
                  <div className="sales-qty">
                    <button type="button" onClick={() => updateCart(row.id, { cantidad: row.cantidad - 1 })}>
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <input
                      inputMode="numeric"
                      value={row.cantidad}
                      onChange={(event) => updateCart(row.id, { cantidad: event.target.value.replace(/\D/g, "") })}
                    />
                    <button type="button" onClick={() => updateCart(row.id, { cantidad: row.cantidad + 1 })}>
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <input
                    className="sales-price-input"
                    inputMode="numeric"
                    value={row.precio_unitario}
                    onChange={(event) => updateCart(row.id, { precio_unitario: event.target.value.replace(/\D/g, "") })}
                  />
                  <strong>{formatMoney(row.cantidad * row.precio_unitario)}</strong>
                  <button className="action-button danger" type="button" onClick={() => setCart((current) => current.filter((item) => item.id !== row.id))}>
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </div>
              ))}
              {!cart.length ? <div className="empty-state compact-empty">Agrega productos para vender.</div> : null}
            </div>
            <label className="legacy-field">
              <span>Metodo de pago</span>
              <select value={metodoPago} onChange={(event) => setMetodoPago(event.target.value)}>
                {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </label>
            <label className="legacy-field">
              <span>Notas</span>
              <input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
            <div className="sales-total-box">
              <span>Total venta</span>
              <strong>{formatMoney(totals.total)}</strong>
              <span>Costo directo</span>
              <strong>{formatMoney(totals.costo)}</strong>
            </div>
            <button className="primary-button inline-primary compact-button" type="submit" disabled={saving || !cart.length}>
              <Save size={16} aria-hidden="true" />
              {saving ? "Guardando..." : "Registrar venta"}
            </button>
            {message ? <p className="maintainer-message">{message}</p> : null}
          </form>
        </div>
      </section>

      <section className="panel section-gap">
        <div className="panel-header"><h2>Ventas recientes</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Pago</th>
                <th>Total</th>
                <th>Costo</th>
                <th className="text-center">Boleta</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((sale) => (
                <tr key={sale.id}>
                  <td>{new Date(sale.fecha).toLocaleString("es-CL")}</td>
                  <td>{sale.tipo}</td>
                  <td>{textOrDash(sale.metodo_pago)}</td>
                  <td>{formatMoney(sale.total_bruto)}</td>
                  <td>{formatMoney(sale.costo_directo)}</td>
                  <td className="text-center">
                    {sale.tipo === "producto" ? (
                      <Link className="action-button" href={`/erp/ventas/${sale.id}/boleta`} title="Imprimir boleta">
                        <Printer size={15} aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="subtext">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
