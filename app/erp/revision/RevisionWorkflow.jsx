"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate, formatDateTime, formatMoney, textOrDash } from "@/lib/format";

const ORDER_STATES = [
  { id: 2, label: "En diagnostico" },
  { id: 3, label: "Listo para Retirar" },
  { id: 4, label: "Garantia" },
];

function toInt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0;
}

function ReadonlyField({ label, value }) {
  return (
    <label className="legacy-field">
      <span>{label}:</span>
      <input value={textOrDash(value)} readOnly />
    </label>
  );
}

function calcTotals(serviceTotal, discount) {
  const total = Math.max(0, toInt(serviceTotal) - toInt(discount));
  const subtotal = Math.round(total / 1.19);
  return {
    subtotal,
    iva: total - subtotal,
    total,
  };
}

export default function RevisionWorkflow({ order, services, workshopItems = [] }) {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState("");
  const [estado, setEstado] = useState(String(order.estado >= 5 ? order.estado : Math.max(2, order.estado || 2)));
  const [metodopago, setMetodopago] = useState(order.metodopago || "");
  const [descuento, setDescuento] = useState(toInt(order.descuento));
  const [selectedService, setSelectedService] = useState("");
  const [selectedPart, setSelectedPart] = useState("");
  const [createService, setCreateService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [serviceRows, setServiceRows] = useState(() =>
    (order.services || []).map((service) => ({
      key: `linked-${service.id}`,
      id: service.servicio_id,
      servicio_id: service.servicio_id,
      nombre: service.nombre,
      precio: toInt(service.precio),
      isNew: false,
    }))
  );
  const [partRows, setPartRows] = useState(() =>
    (order.repuestos || []).map((part) => ({
      key: `part-${part.id}`,
      inventario_item_id: part.inventario_item_id,
      producto: part.producto,
      marca: part.marca,
      cantidad: toInt(part.cantidad) || 1,
      costo_unitario: toInt(part.costo_unitario),
      precio_unitario: toInt(part.precio_unitario),
    }))
  );

  const isClosed = Number(order.estado) >= 5;
  const serviceTotal = useMemo(
    () => serviceRows.reduce((sum, service) => sum + toInt(service.precio), 0),
    [serviceRows]
  );
  const partsTotal = useMemo(
    () => partRows.reduce((sum, part) => sum + toInt(part.precio_unitario) * toInt(part.cantidad), 0),
    [partRows]
  );
  const totals = useMemo(() => calcTotals(serviceTotal + partsTotal, descuento), [serviceTotal, partsTotal, descuento]);
  const displayTotals = isClosed
    ? {
        subtotal: toInt(order.subtotal),
        iva: toInt(order.iva),
        total: toInt(order.total),
      }
    : totals;

  function addSelectedService() {
    const id = Number(selectedService);
    const service = services.find((item) => Number(item.id) === id);
    if (!service) return;

    setServiceRows((current) => {
      if (current.some((row) => Number(row.servicio_id || row.id) === id)) return current;
      return [
        ...current,
        {
          key: `service-${id}-${Date.now()}`,
          id,
          servicio_id: id,
          nombre: service.nombre,
          precio: toInt(service.precio),
          isNew: true,
        },
      ];
    });
    setSelectedService("");
  }

  function addManualService() {
    const name = newServiceName.trim();
    const price = toInt(newServicePrice);
    if (!name || !price) {
      setMessage("Ingresa nombre y valor del servicio.");
      return;
    }

    setServiceRows((current) => [
      ...current,
      {
        key: `manual-${Date.now()}`,
        id: null,
        servicio_id: null,
        nombre: name,
        precio: price,
        isNew: true,
      },
    ]);
    setNewServiceName("");
    setNewServicePrice("");
    setMessage("");
  }

  function addSelectedPart() {
    const id = Number(selectedPart);
    const item = workshopItems.find((part) => Number(part.id) === id);
    if (!item) return;

    setPartRows((current) => {
      const existing = current.find((row) => Number(row.inventario_item_id) === id);
      if (existing) {
        return current.map((row) =>
          Number(row.inventario_item_id) === id
            ? { ...row, cantidad: Math.min(toInt(row.cantidad) + 1, toInt(item.cantidad)) }
            : row
        );
      }
      return [
        ...current,
        {
          key: `part-${id}-${Date.now()}`,
          inventario_item_id: id,
          producto: item.producto,
          marca: item.marca,
          cantidad: 1,
          costo_unitario: toInt(item.valor_original),
          precio_unitario: 0,
          stock: toInt(item.cantidad),
        },
      ];
    });
    setSelectedPart("");
  }

  function updatePart(key, patch) {
    setPartRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        next.cantidad = Math.max(1, toInt(next.cantidad, 1));
        next.costo_unitario = toInt(next.costo_unitario);
        next.precio_unitario = toInt(next.precio_unitario);
        return next;
      })
    );
  }

  function removeNewService(key) {
    setServiceRows((current) => current.filter((service) => service.key !== key || !service.isNew));
  }

  async function saveRevision(action) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/erp/ordenes/${order.id}/revision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          estado: action === "close" ? 5 : Number(estado),
          observacion: diagnosis,
          services: serviceRows.filter((service) => service.isNew),
          repuestos: partRows,
          serviceTotal: serviceTotal + partsTotal,
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

      setMessage("Diagnostico y servicios guardados.");
      setDiagnosis("");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
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
            <span className="pill">{textOrDash(order.estado_nombre || order.estado)}</span>
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
          <ReadonlyField label="Equipo" value={order.equipo_nombre} />
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
            {!isClosed ? (
              <>
                <label className="legacy-field">
                  <span>Ingresar Servicio:</span>
                  <div className="legacy-input-button">
                    <select value={selectedService} onChange={(event) => setSelectedService(event.target.value)}>
                      <option value="">Seleccione Servicio</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.nombre} - {formatMoney(service.precio)}
                        </option>
                      ))}
                    </select>
                    <button className="legacy-plus" type="button" onClick={addSelectedService}>
                      +
                    </button>
                  </div>
                </label>
                <label className="revision-create-service">
                  <input
                    type="checkbox"
                    checked={createService}
                    onChange={(event) => setCreateService(event.target.checked)}
                  />
                  <span>Crear Servicio</span>
                </label>
                {createService ? (
                  <div className="revision-new-service">
                    <label className="legacy-field">
                      <span>Nombre servicio:</span>
                      <input value={newServiceName} onChange={(event) => setNewServiceName(event.target.value)} />
                    </label>
                    <label className="legacy-field">
                      <span>Valor servicio:</span>
                      <input
                        inputMode="numeric"
                        value={newServicePrice}
                        onChange={(event) => setNewServicePrice(event.target.value.replace(/\D/g, ""))}
                      />
                    </label>
                    <button className="btn-dark-legacy revision-insert-service" type="button" onClick={addManualService}>
                      Insertar Servicio
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="revision-service-list">
              {serviceRows.map((service) => (
                <div className="revision-service-row" key={service.key}>
                  <span>{textOrDash(service.nombre)}</span>
                  <strong>{formatMoney(service.precio)}</strong>
                  {service.isNew && !isClosed ? (
                    <button type="button" onClick={() => removeNewService(service.key)} aria-label="Quitar servicio">
                      x
                    </button>
                  ) : null}
                </div>
              ))}
              {!serviceRows.length ? <div className="empty-state compact-empty">Sin servicios ingresados.</div> : null}
            </div>

            {!isClosed ? (
              <>
                <label className="legacy-field">
                  <span>Repuestos Taller:</span>
                  <div className="legacy-input-button">
                    <select value={selectedPart} onChange={(event) => setSelectedPart(event.target.value)}>
                      <option value="">Seleccione Repuesto</option>
                      {workshopItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.producto} - Stock {item.cantidad}
                        </option>
                      ))}
                    </select>
                    <button className="legacy-plus" type="button" onClick={addSelectedPart}>
                      +
                    </button>
                  </div>
                </label>
              </>
            ) : null}

            <div className="revision-service-list">
              {partRows.map((part) => (
                <div className="revision-part-row" key={part.key}>
                  <span>{textOrDash(part.producto)}</span>
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
                    readOnly={isClosed}
                    onChange={(event) => updatePart(part.key, { precio_unitario: event.target.value.replace(/\D/g, "") })}
                    title="Precio venta"
                  />
                  <strong>{formatMoney(toInt(part.costo_unitario) * toInt(part.cantidad))}</strong>
                  {!isClosed ? (
                    <button type="button" onClick={() => setPartRows((current) => current.filter((row) => row.key !== part.key))}>
                      x
                    </button>
                  ) : null}
                </div>
              ))}
              {!partRows.length ? <div className="empty-state compact-empty">Sin repuestos asociados.</div> : null}
            </div>
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
              {saving ? "Guardando..." : "Guardar Diagnostico y Servicios"}
            </button>
          </div>
        ) : null}
        {message ? <p className="save-status">{message}</p> : null}
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
