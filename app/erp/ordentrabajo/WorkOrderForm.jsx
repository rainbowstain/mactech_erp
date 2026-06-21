"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/format";

function nowForInput() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function Field({ label, required, children }) {
  return (
    <label className="legacy-field">
      <span>
        {label}
        {required ? <b> *</b> : null}
      </span>
      {children}
    </label>
  );
}

export default function WorkOrderForm({ equipment, devices, states, questions, parts = [], workshopItems = [] }) {
  const router = useRouter();
  const [deviceItems, setDeviceItems] = useState(workshopItems);
  const [status, setStatus] = useState("");
  const [loadingClient, setLoadingClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [clientExists, setClientExists] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [answers, setAnswers] = useState({});
  const [client, setClient] = useState({
    id: null,
    run: "",
    nombre: "",
    mail: "",
    fono: "",
  });
  const [order, setOrder] = useState({
    created_at: nowForInput(),
    fecha_entrega: "",
    id_equipo: "",
    id_dispositivo: "",
    reparacion_id: "",
    reparaciones: [{ reparacion_id: "", inventario_item_id: "", precio_unitario: "" }],
    estado_dispositivo: "",
    codigo: "",
    imei: "",
    total_recepcion: "19990",
    observacion: "",
  });

  const filteredDevices = useMemo(() => {
    if (!order.id_equipo) return devices;
    return devices.filter((device) => String(device.modelo) === String(order.id_equipo));
  }, [devices, order.id_equipo]);

  const visibleQuestions = useMemo(() => {
    if (!order.estado_dispositivo) return [];
    return questions.slice(0, 14);
  }, [order.estado_dispositivo, questions]);

  const repairOptions = useMemo(
    () => parts.filter((part) => Number(part.estado) === 1),
    [parts]
  );

  // Carga los repuestos del dispositivo bajo demanda (evita traer todo el catalogo).
  useEffect(() => {
    if (!order.id_dispositivo) {
      setDeviceItems([]);
      return;
    }
    let active = true;
    fetch(`/api/erp/inventario/items?area=taller&dispositivoId=${order.id_dispositivo}&pageSize=200`)
      .then((response) => response.json().catch(() => ({})))
      .then((payload) => {
        if (active) setDeviceItems(payload.items || []);
      })
      .catch(() => {
        if (active) setDeviceItems([]);
      });
    return () => {
      active = false;
    };
  }, [order.id_dispositivo]);

  const matchingWorkshopItems = useMemo(() => {
    if (!order.id_dispositivo) return new Map();
    const itemsByRepair = new Map();
    for (const item of deviceItems) {
      if (Number(item.estado) !== 1) continue;
      if (Number(item.dispositivo_id) !== Number(order.id_dispositivo)) continue;
      const key = String(item.repuesto_id || "");
      if (!itemsByRepair.has(key)) itemsByRepair.set(key, []);
      itemsByRepair.get(key).push(item);
    }
    return itemsByRepair;
  }, [order.id_dispositivo, deviceItems]);

  async function searchClient() {
    const run = client.run.trim();
    setStatus("");

    if (!run) {
      setStatus("Debe ingresar un RUN valido.");
      return;
    }

    setLoadingClient(true);
    try {
      const response = await fetch(`/api/erp/clientes/lookup?run=${encodeURIComponent(run)}`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus(data.message || "No se pudo buscar el cliente.");
        return;
      }

      if (data.client) {
        setClient({
          id: data.client.id,
          run: data.client.run || run,
          nombre: data.client.nombre || "",
          mail: data.client.mail || "",
          fono: data.client.fono || "",
        });
        setClientExists(true);
        setStatus("Cliente encontrado. Datos cargados automaticamente.");
      } else {
        setClient((current) => ({
          ...current,
          id: null,
          nombre: "",
          mail: "",
          fono: "",
        }));
        setClientExists(false);
        setStatus(data.message || "Cliente no registrado. Puedes ingresarlo como nuevo.");
      }

      setShowForm(true);
    } catch {
      setStatus("No se pudo conectar con la busqueda de clientes.");
    } finally {
      setLoadingClient(false);
    }
  }

  function updateClient(field, value) {
    setClient((current) => ({ ...current, [field]: value }));
  }

  function updateOrder(field, value) {
    if (field === "id_equipo" || field === "estado_dispositivo") {
      setAnswers({});
    }

    setOrder((current) => {
      if (field === "id_equipo") {
        return {
          ...current,
          id_equipo: value,
          id_dispositivo: "",
          reparacion_id: "",
          reparaciones: [{ reparacion_id: "", inventario_item_id: "", precio_unitario: "" }],
          estado_dispositivo: "",
        };
      }
      if (field === "id_dispositivo") {
        return {
          ...current,
          id_dispositivo: value,
          reparacion_id: "",
          reparaciones: [{ reparacion_id: "", inventario_item_id: "", precio_unitario: "" }],
        };
      }
      return { ...current, [field]: value };
    });
  }

  function updateRepair(index, field, value) {
    setOrder((current) => {
      const reparaciones = current.reparaciones.map((repair, repairIndex) => {
        if (repairIndex !== index) return repair;
        if (field === "reparacion_id") return { ...repair, reparacion_id: value, inventario_item_id: "", precio_unitario: "" };
        if (field === "inventario_item_id") {
          const found = deviceItems.find((item) => String(item.id) === String(value));
          const lastPrice = found ? found.ultimo_precio_venta || found.valor_venta || "" : "";
          return { ...repair, inventario_item_id: value, precio_unitario: lastPrice ? String(lastPrice) : repair.precio_unitario };
        }
        return { ...repair, [field]: value };
      });
      return {
        ...current,
        reparaciones,
        reparacion_id: reparaciones.find((repair) => repair.reparacion_id)?.reparacion_id || "",
      };
    });
  }

  function addRepair() {
    setOrder((current) => ({
      ...current,
      reparaciones: [...current.reparaciones, { reparacion_id: "", inventario_item_id: "", precio_unitario: "" }],
    }));
  }

  function removeRepair(index) {
    setOrder((current) => {
      const reparaciones = current.reparaciones.filter((_, repairIndex) => repairIndex !== index);
      const nextReparaciones = reparaciones.length ? reparaciones : [{ reparacion_id: "", inventario_item_id: "", precio_unitario: "" }];
      return {
        ...current,
        reparaciones: nextReparaciones,
        reparacion_id: nextReparaciones.find((repair) => repair.reparacion_id)?.reparacion_id || "",
      };
    });
  }

  function updateAnswer(questionId, checked) {
    setAnswers((current) => ({ ...current, [questionId]: checked }));
  }

  async function saveOrder(event) {
    event.preventDefault();
    setSaveMessage("");

    if (!showForm) {
      setSaveMessage("Primero debe buscar el cliente por RUN.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client,
        order,
        answers: visibleQuestions.map((question) => ({
          pregunta_id: question.id,
          respuesta: question.descripcion,
          check_resp: answers[question.id] ?? true,
        })),
      };

      const response = await fetch("/api/erp/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSaveMessage(data.message || "No se pudo guardar la orden.");
        return;
      }

      setSaveMessage("Orden guardada. Abriendo protocolo...");
      router.push(`/erp/ordenes/${data.id}/protocolo`);
      router.refresh();
    } catch {
      setSaveMessage("No se pudo conectar con el guardado de ordenes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="legacy-workflow" onSubmit={saveOrder}>
      <article className="legacy-block">
        <div className="legacy-block-header">
          <h2>Protocolo de recepcion de equipos</h2>
          <span className="legacy-step">Recepcion</span>
        </div>

        <div className="legacy-row legacy-row-first">
          <div className="legacy-run-group">
            <Field label="Run" required>
              <div className="legacy-input-button">
                <input
                  type="search"
                  placeholder="RUN ejemplo(12345678-9)"
                  value={client.run}
                  onChange={(event) => updateClient("run", event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      searchClient();
                    }
                  }}
                />
                <button className="btn-dark-legacy" type="button" onClick={searchClient} disabled={loadingClient}>
                  {loadingClient ? "Buscando..." : "Buscar"}
                </button>
              </div>
            </Field>
            <p className={`lookup-status ${clientExists ? "found" : ""}`}>{status}</p>
          </div>
          <Field label="Fecha Ingreso">
            <input
              type="datetime-local"
              value={order.created_at}
              onChange={(event) => updateOrder("created_at", event.target.value)}
            />
          </Field>
        </div>

        {showForm ? (
          <>
            <div className="legacy-form-grid legacy-form-grid-three">
              <Field label="Nombre" required>
                <input
                  placeholder="nombre"
                  required
                  value={client.nombre}
                  onChange={(event) => updateClient("nombre", event.target.value)}
                />
              </Field>
              <Field label="Mail">
                <input
                  type="email"
                  placeholder="Mail"
                  value={client.mail}
                  onChange={(event) => updateClient("mail", event.target.value)}
                />
              </Field>
              <Field label="Contacto" required>
                <div className="legacy-input-addon">
                  <span>+569</span>
                  <input
                    inputMode="numeric"
                    placeholder="Contacto"
                    value={client.fono}
                    onChange={(event) => updateClient("fono", event.target.value.replace(/\D/g, "").slice(0, 8))}
                  />
                </div>
              </Field>
            </div>

            <div className="legacy-form-grid legacy-form-grid-three">
              <Field label="Marca" required>
                <div className="legacy-input-button compact">
                  <select value={order.id_equipo} onChange={(event) => updateOrder("id_equipo", event.target.value)} required>
                    <option value="">Seleccionar...</option>
                    {equipment.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="legacy-plus">+</button>
                </div>
              </Field>
              <Field label="Modelo" required>
                <div className="legacy-input-button compact">
                  <select
                    value={order.id_dispositivo}
                    onChange={(event) => updateOrder("id_dispositivo", event.target.value)}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    {filteredDevices.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="legacy-plus">+</button>
                </div>
              </Field>
              <Field label="Codigo">
                <input
                  placeholder="Codigo o clave de ingreso"
                  value={order.codigo}
                  onChange={(event) => updateOrder("codigo", event.target.value)}
                />
              </Field>
            </div>

            <div className="legacy-form-grid legacy-form-grid-three">
              <div className="legacy-field legacy-field-form-wide">
                <span>Reparaciones <b>*</b></span>
                <div className="repair-list">
                  {order.reparaciones.map((repair, index) => {
                    const availableItems = matchingWorkshopItems.get(String(repair.reparacion_id || "")) || [];
                    return (
                      <div className="repair-row" key={index}>
                        <select
                          value={repair.reparacion_id}
                          onChange={(event) => updateRepair(index, "reparacion_id", event.target.value)}
                          disabled={!order.id_dispositivo}
                          required={index === 0}
                        >
                          <option value="">{order.id_dispositivo ? "Seleccionar reparacion..." : "Seleccione modelo primero"}</option>
                          {repairOptions.map((part) => (
                            <option key={part.id} value={part.id}>
                              {part.nombre}
                            </option>
                          ))}
                        </select>
                        <select
                          value={repair.inventario_item_id}
                          onChange={(event) => updateRepair(index, "inventario_item_id", event.target.value)}
                          disabled={!repair.reparacion_id || !availableItems.length}
                        >
                          <option value="">
                            {!repair.reparacion_id
                              ? "Seleccione reparacion"
                              : availableItems.length
                                ? "Tipo disponible..."
                                : "Sin alternativas cargadas"}
                          </option>
                          {availableItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.producto} - {formatMoney(item.ultimo_precio_venta || item.valor_venta)}
                            </option>
                          ))}
                        </select>
                        <input
                          className="repair-row-price"
                          inputMode="numeric"
                          value={repair.precio_unitario}
                          onChange={(event) => updateRepair(index, "precio_unitario", event.target.value.replace(/\D/g, ""))}
                          placeholder="Precio cobrado"
                          aria-label="Precio cobrado al cliente"
                        />
                        <button
                          className="ghost-button compact-button repair-row-action"
                          type="button"
                          onClick={() => removeRepair(index)}
                          disabled={order.reparaciones.length === 1}
                          title="Quitar reparacion"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                  <button className="ghost-button compact-button inline-primary repair-add-button" type="button" onClick={addRepair}>
                    <Plus size={15} aria-hidden="true" />
                    Agregar reparacion
                  </button>
                </div>
              </div>
            </div>

            <div className="legacy-form-grid legacy-form-grid-three">
              <Field label="IMEI o Serie">
                <input
                  inputMode="numeric"
                  placeholder="Imei o Serie"
                  value={order.imei}
                  onChange={(event) => updateOrder("imei", event.target.value.replace(/[-+eE]/g, ""))}
                />
              </Field>
              <Field label="Valor Diagnostico">
                <div className="legacy-input-addon">
                  <span>$</span>
                  <input
                    type="number"
                    value={order.total_recepcion}
                    onChange={(event) => updateOrder("total_recepcion", event.target.value)}
                  />
                </div>
              </Field>
              <Field label="Fecha Entrega">
                <input
                  type="date"
                  value={order.fecha_entrega}
                  onChange={(event) => updateOrder("fecha_entrega", event.target.value)}
                />
              </Field>
            </div>
          </>
        ) : null}
      </article>

      {showForm ? (
        <article className="legacy-block">
          <div className="legacy-block-header">
            <h2>Estado del equipo</h2>
            <span className="legacy-step">Checklist</span>
          </div>
          <div className="legacy-row">
            <div className="legacy-question-title">1.-En que estado ingresa el celular <b>*</b></div>
            <Field label="Estado">
              <select
                value={order.estado_dispositivo}
                onChange={(event) => updateOrder("estado_dispositivo", event.target.value)}
                required
              >
                <option value="">Seleccionar...</option>
                {states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {visibleQuestions.length ? (
            <div className="check-grid">
              {visibleQuestions.map((question) => (
                <label className="check-card" key={question.id}>
                  <input
                    type="checkbox"
                    checked={answers[question.id] ?? true}
                    onChange={(event) => updateAnswer(question.id, event.target.checked)}
                  />
                  <span>{question.descripcion}</span>
                </label>
              ))}
            </div>
          ) : null}
          <label className="legacy-field legacy-field-wide">
            <span>Observacion</span>
            <textarea
              rows={4}
              value={order.observacion}
              onChange={(event) => updateOrder("observacion", event.target.value)}
            />
          </label>
          {saveMessage ? <p className="save-status">{saveMessage}</p> : null}
          <div className="legacy-actions centered">
            <button className="primary-button inline-primary legacy-save" type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </article>
      ) : null}
    </form>
  );
}
