"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

export default function WorkOrderForm({ equipment, devices, states, questions }) {
  const router = useRouter();
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
        return { ...current, id_equipo: value, id_dispositivo: "", estado_dispositivo: "" };
      }
      return { ...current, [field]: value };
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
                    onChange={(event) => updateClient("fono", event.target.value.slice(0, 8))}
                  />
                </div>
              </Field>
            </div>

            <div className="legacy-form-grid legacy-form-grid-three">
              <Field label="Equipo" required>
                <div className="legacy-input-button compact">
                  <select value={order.id_equipo} onChange={(event) => updateOrder("id_equipo", event.target.value)}>
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
