"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime, formatMoney, orderStatusPillClass, textOrDash } from "@/lib/format";
import { notifySuccess, notifyWarning } from "@/lib/notify";

const ORDER_STATES = [
  { id: 2, label: "En diagnostico" },
  { id: 6, label: "Espera repuesto" },
  { id: 3, label: "Listo para Retirar" },
  { id: 4, label: "Garantia" },
];

// Nota de cierre que se deja pre-escrita y editable en el campo de
// diagnostico/reparacion (antes se insertaba automaticamente al cerrar).
const DEFAULT_CLOSE_NOTE = "Equipo funciona correctamente, cliente retira conforme.";

function toInt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

// Algunos items generales migrados quedaron con nombres basura (p.ej. "123").
// Los ocultamos al usuario: un repuesto valido tiene nombre con letras.
function isHiddenItem(item) {
  const name = String(item?.producto || "").trim();
  if (!name) return true;
  if (!/[a-zá-úñ]/i.test(name)) return true; // solo numeros/simbolos => basura
  return false;
}

function ReadonlyField({ label, value }) {
  return (
    <label className="legacy-field">
      <span>{label}:</span>
      <input value={textOrDash(value)} readOnly />
    </label>
  );
}

function calcTotals(serviceTotal, discount, fallbackTotal = 0) {
  const baseTotal = toInt(serviceTotal) > 0 ? toInt(serviceTotal) : toInt(fallbackTotal);
  const total = Math.max(0, baseTotal - toInt(discount));
  const subtotal = Math.round(total / 1.19);
  return {
    subtotal,
    iva: total - subtotal,
    total,
  };
}

export default function RevisionWorkflow({ order, workshopItems = [], canEditCosts = false }) {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState(DEFAULT_CLOSE_NOTE);
  const [estado, setEstado] = useState(String(order.estado >= 5 ? order.estado : Math.max(2, order.estado || 2)));
  const [metodopago, setMetodopago] = useState(order.metodopago || "");
  const [descuento, setDescuento] = useState(toInt(order.descuento));
  const [partQuery, setPartQuery] = useState("");
  const [partOpen, setPartOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);
  const [partRows, setPartRows] = useState(() => {
    const saved = (order.repuestos || []).map((part) => ({
      key: `part-${part.id}`,
      id: part.id,
      inventario_item_id: part.inventario_item_id,
      producto: part.producto,
      marca: part.marca,
      cantidad: toInt(part.cantidad) || 1,
      costo_unitario: toInt(part.costo_unitario),
      precio_unitario: toInt(part.precio_unitario),
    }));
    // Si la orden ya esta cerrada o ya tiene repuestos guardados, respetamos esa lista
    // (incluye eventuales generales que el tecnico haya borrado en su momento).
    if (saved.length || Number(order.estado) >= 5) return saved;
    // Primera revision: precargamos los items generales (diagnostico, reparacion placa,
    // etc.) con su precio general; quedan editables y se pueden quitar.
    return workshopItems
      .filter((item) => item.es_general && Number(item.estado) === 1 && !isHiddenItem(item))
      .map((item) => ({
        key: `gen-${item.id}`,
        isNew: true,
        inventario_item_id: item.id,
        producto: item.producto,
        marca: item.marca,
        cantidad: 1,
        costo_unitario: toInt(item.valor_original),
        precio_unitario: toInt(item.ultimo_precio_venta || item.valor_venta),
        stock: toInt(item.cantidad),
      }));
  });

  const isClosed = Number(order.estado) >= 5;
  const partMatches = useMemo(() => {
    const q = partQuery.trim().toLowerCase();
    const active = workshopItems.filter((item) => Number(item.estado) === 1 && !isHiddenItem(item));
    const base = q
      ? active.filter((item) =>
          [item.producto, item.marca, item.repuesto_nombre]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(q))
        )
      : active;
    // Generales primero, luego por nombre.
    return [...base]
      .sort((a, b) => Number(Boolean(b.es_general)) - Number(Boolean(a.es_general)) || (a.producto || "").localeCompare(b.producto || ""))
      .slice(0, 40);
  }, [workshopItems, partQuery]);
  const partsTotal = useMemo(
    () => partRows.reduce((sum, part) => sum + toInt(part.precio_unitario) * toInt(part.cantidad), 0),
    [partRows]
  );
  const totals = useMemo(
    () => calcTotals(partsTotal, descuento, order.total_recepcion),
    [partsTotal, descuento, order.total_recepcion]
  );
  const displayTotals = isClosed
    ? {
        subtotal: toInt(order.subtotal),
        iva: toInt(order.iva),
        total: toInt(order.total),
      }
    : totals;

  function addPart(itemId) {
    const id = Number(itemId);
    const item = workshopItems.find((part) => Number(part.id) === id);
    if (!item) return;

    setPartRows((current) => {
      const existing = current.find((row) => Number(row.inventario_item_id) === id);
      if (existing) {
        // Sin tope por stock: el inventario aun no esta contado.
        return current.map((row) =>
          Number(row.inventario_item_id) === id
            ? { ...row, cantidad: toInt(row.cantidad) + 1 }
            : row
        );
      }
      return [
        ...current,
        {
          key: `part-${id}-${Date.now()}`,
          isNew: true,
          inventario_item_id: id,
          producto: item.producto,
          marca: item.marca,
          cantidad: 1,
          costo_unitario: toInt(item.valor_original),
          precio_unitario: toInt(item.ultimo_precio_venta || item.valor_venta),
          stock: toInt(item.cantidad),
        },
      ];
    });
    setPartQuery("");
    setPartOpen(false);
  }

  function updatePart(key, patch) {
    setPartRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        next.cantidad = Math.max(1, toInt(next.cantidad));
        next.costo_unitario = toInt(next.costo_unitario);
        next.precio_unitario = toInt(next.precio_unitario);
        return next;
      })
    );
  }

  async function saveCostCorrection() {
    if (!partRows.length) {
      notifyWarning("Agrega al menos un repuesto antes de guardar.");
      return;
    }
    setSavingCosts(true);
    try {
      // Un item existente en BD tiene id entero positivo; todo lo demás es nuevo.
      const isDbRow = (p) => Number.isInteger(Number(p.id)) && Number(p.id) > 0;
      const existing = partRows.filter(isDbRow).map((p) => ({
        id: Number(p.id),
        costo_unitario: p.costo_unitario,
        precio_unitario: p.precio_unitario,
      }));
      const nuevos = partRows.filter((p) => !isDbRow(p)).map((p) => ({
        inventario_item_id: p.inventario_item_id,
        cantidad: p.cantidad,
        costo_unitario: p.costo_unitario,
        precio_unitario: p.precio_unitario,
      }));
      const response = await fetch(`/api/erp/ordenes/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repuestos: existing, repuestosNuevos: nuevos }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar.");
      notifySuccess("Costos actualizados correctamente.");
      router.refresh();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSavingCosts(false);
    }
  }

  async function saveRevision(action) {
    setSaving(true);

    try {
      const response = await fetch(`/api/erp/ordenes/${order.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          estado: action === "close" ? 5 : Number(estado),
          observacion: diagnosis,
          repuestos: partRows,
          serviceTotal: partsTotal,
          descuento,
          metodopago,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || "No se pudo guardar la revision.");
      }

      if (action === "close") {
        router.push(`/erp/ordenes/${order.id}/pdf`);
        return;
      }

      notifySuccess("Diagnostico y repuestos guardados.");
      setDiagnosis(DEFAULT_CLOSE_NOTE);
      router.refresh();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="legacy-block section-gap">
        <div className="legacy-block-header">
          <h2>Datos de Orden</h2>
          <div className="revision-order-actions">
            <span className={`pill ${orderStatusPillClass(order.estado)}`}>
              {textOrDash(order.estado_nombre || order.estado)}
            </span>
            <Link className="action-button" href={`/erp/ordenes/${order.id}/protocolo`} title="Protocolo PDF">
              PDF
            </Link>
            {isClosed ? (
              <Link className="action-button" href={`/erp/ordenes/${order.id}/pdf`} title="Orden PDF">
                OT
              </Link>
            ) : null}
          </div>
        </div>
        <div className="revision-order-title">
          <h2>Orden nº {order.id}</h2>
        </div>
        <div className="legacy-form-grid legacy-form-grid-three">
          <ReadonlyField label="Run" value={order.cliente_run} />
          <ReadonlyField label="Nombre" value={order.cliente_nombre} />
          <ReadonlyField label="Fecha Ingreso" value={formatDateTime(order.created_at)} />
          <ReadonlyField label="Telefono" value={order.cliente_fono} />
          <ReadonlyField label="Mail" value={order.cliente_mail} />
          <ReadonlyField label="Fecha Entrega" value={formatDate(order.fecha_entrega)} />
          <ReadonlyField label="Marca" value={order.equipo_nombre} />
          <ReadonlyField label="Modelo" value={order.dispositivo_nombre} />
          <ReadonlyField label="IMEI" value={order.imei} />
          <ReadonlyField label="Codigo" value={order.codigo} />
          <ReadonlyField label="Tecnico" value={order.tecnico} />
          <ReadonlyField label="Total" value={formatMoney(order.total)} />
        </div>
        <label className="legacy-field legacy-field-wide">
          <span>Observacion:</span>
          <textarea value={textOrDash(order.observacion)} readOnly rows={4} />
        </label>
      </section>

      <section className="legacy-block section-gap">
        <div className="legacy-block-header">
          <h2>Historial de Orden</h2>
        </div>
        <div className="table-wrap revision-table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Responsable</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th>Observacion</th>
              </tr>
            </thead>
            <tbody>
              {(order.revisions || []).map((revision, index) => (
                <tr key={revision.id}>
                  <td>{index + 1}</td>
                  <td>{textOrDash(revision.responsable)}</td>
                  <td>{formatDateTime(revision.created_at)}</td>
                  <td>{textOrDash(revision.nombre_estado)}</td>
                  <td>{textOrDash(revision.observacion)}</td>
                </tr>
              ))}
              {!order.revisions?.length ? (
                <tr>
                  <td colSpan="5">Sin revisiones registradas.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="legacy-block section-gap">
        <div className="legacy-block-header">
          <h2>Diagnosticos</h2>
        </div>
        <div className="revision-editor-grid">
          <div className="revision-editor-column">
            <label className="legacy-field">
              <span>Observacion:</span>
              <textarea value={textOrDash(order.observacion)} readOnly rows={5} />
            </label>
            {!isClosed ? (
              <>
                <label className="legacy-field">
                  <span>Diagnostico o Reparacion:</span>
                  <textarea
                    value={diagnosis}
                    onChange={(event) => setDiagnosis(event.target.value)}
                    rows={8}
                    placeholder="Ingrese Diagnostico o Reparacion..."
                  />
                </label>
                <label className="legacy-field revision-state-select">
                  <span>Estado:</span>
                  <select value={estado} onChange={(event) => setEstado(event.target.value)}>
                    {ORDER_STATES.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : null}
          </div>

          <div className="revision-editor-column revision-services-panel">
            {(!isClosed || canEditCosts) ? (
              <label className="legacy-field">
                <span>{isClosed ? "Agregar repuesto (corrección):" : "Repuestos:"}</span>
                <div className="part-search">
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Buscar repuesto (batería, pantalla, diagnóstico…)"
                    value={partQuery}
                    onChange={(event) => {
                      setPartQuery(event.target.value);
                      setPartOpen(true);
                    }}
                    onFocus={() => setPartOpen(true)}
                    onBlur={() => setTimeout(() => setPartOpen(false), 200)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (partMatches[0]) addPart(partMatches[0].id);
                      }
                      if (event.key === "Escape") setPartOpen(false);
                    }}
                  />
                  {partOpen ? (
                    <ul className="part-search-list">
                      {partMatches.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              addPart(item.id);
                            }}
                          >
                            <span className="part-search-name">
                              {item.es_general ? "• " : ""}
                              {item.producto}
                            </span>
                            <span className="part-search-meta">
                              {formatMoney(item.ultimo_precio_venta || item.valor_venta)}
                              {item.es_general ? " · general" : ` · stock ${item.cantidad}`}
                            </span>
                          </button>
                        </li>
                      ))}
                      {!partMatches.length ? (
                        <li className="part-search-empty">Sin resultados</li>
                      ) : null}
                    </ul>
                  ) : null}
                </div>
              </label>
            ) : null}

            <div className="revision-service-list">
              {partRows.map((part) => (
                <div className={`revision-part-row${isClosed && canEditCosts ? " revision-part-row--cost" : ""}`} key={part.key}>
                  <span title={textOrDash(part.producto)}>{textOrDash(part.producto)}</span>
                  <input
                    inputMode="numeric"
                    value={part.cantidad}
                    readOnly={isClosed}
                    onChange={(event) => updatePart(part.key, { cantidad: event.target.value.replace(/\D/g, "") })}
                    title="Cantidad"
                  />
                  <input
                    inputMode="numeric"
                    value={part.precio_unitario}
                    readOnly={isClosed && !canEditCosts}
                    onChange={(event) => updatePart(part.key, { precio_unitario: event.target.value.replace(/\D/g, "") })}
                    title="Precio cobrado al cliente"
                    placeholder="Precio venta"
                  />
                  {isClosed && canEditCosts ? (
                    <input
                      inputMode="numeric"
                      value={part.costo_unitario}
                      onChange={(event) => updatePart(part.key, { costo_unitario: event.target.value.replace(/\D/g, "") })}
                      title="Costo real del repuesto (no visible al cliente)"
                      placeholder="Costo"
                    />
                  ) : null}
                  <strong>{formatMoney(toInt(part.precio_unitario) * toInt(part.cantidad))}</strong>
                  {!isClosed ? (
                    <button type="button" onClick={() => setPartRows((current) => current.filter((row) => row.key !== part.key))}>
                      x
                    </button>
                  ) : null}
                </div>
              ))}
              {!partRows.length ? <div className="empty-state compact-empty">Sin repuestos asociados.</div> : null}
            </div>

            {isClosed && canEditCosts ? (
              <div className="legacy-actions centered" style={{ marginTop: "12px" }}>
                <button
                  className="ghost-button compact-button"
                  type="button"
                  disabled={savingCosts}
                  onClick={saveCostCorrection}
                >
                  {savingCosts ? "Guardando..." : "Guardar corrección de costos"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {!isClosed ? (
          <div className="legacy-actions centered">
            <button
              className="primary-button inline-primary compact-button legacy-save"
              type="button"
              disabled={saving}
              onClick={() => saveRevision("save")}
            >
              {saving ? "Guardando..." : "Guardar Diagnostico y Repuestos"}
            </button>
          </div>
        ) : null}
      </section>

      {isClosed ? (
        <section className="legacy-block section-gap">
          <div className="legacy-block-header">
            <h2>Orden cerrada</h2>
          </div>
          <div className="closed-review-notice">
            <p>Esta orden ya fue cerrada. La revision solo muestra historial tecnico y diagnosticos.</p>
            <Link className="ghost-button compact-button" href={`/erp/ordenes/${order.id}`}>
              Ver resumen de cierre
            </Link>
          </div>
        </section>
      ) : (
        <section className="legacy-block section-gap">
          <div className="legacy-block-header">
            <h2>Estado de Orden</h2>
          </div>
          <div className="revision-close-grid">
            <ReadonlyField label="Valor Diagnostico" value={formatMoney(order.total_recepcion)} />
            <ReadonlyField label="Valor Neto" value={formatMoney(displayTotals.subtotal)} />
            <ReadonlyField label="IVA" value={formatMoney(displayTotals.iva)} />
            <label className="legacy-field">
              <span>Descuento:</span>
              <input
                inputMode="numeric"
                value={descuento}
                onChange={(event) => setDescuento(event.target.value.replace(/\D/g, ""))}
              />
            </label>
            <ReadonlyField label="Total" value={formatMoney(displayTotals.total)} />
            <label className="legacy-field">
              <span>Metodo Pago:</span>
              <select value={metodopago} onChange={(event) => setMetodopago(event.target.value)}>
                <option value="">Seleccione</option>
                <option value="EFECTIVO">EFECTIVO</option>
                <option value="REDBANK">REDBANK</option>
              </select>
            </label>
          </div>
          <div className="legacy-actions centered">
            <button
              className="primary-button inline-primary compact-button legacy-save"
              type="button"
              disabled={saving}
              onClick={() => saveRevision("close")}
            >
              Finalizar
            </button>
          </div>
        </section>
      )}
    </>
  );
}
