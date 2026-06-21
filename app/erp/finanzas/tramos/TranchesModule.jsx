"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { formatMoney, textOrDash } from "@/lib/format";

export default function TranchesModule({ tranches }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitTranche(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage("");
    setSaving(true);
    const form = Object.fromEntries(new FormData(formElement));
    try {
      const response = await fetch("/api/erp/finanzas/tramos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(payload.message || "No se pudo guardar.");
      else {
        formElement.reset();
        setMessage("Tramo registrado.");
        router.refresh();
      }
    } catch {
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTranche(tranche) {
    const response = await fetch("/api/erp/finanzas/tramos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tranche.id, estado: tranche.estado ? 0 : 1 }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(payload.message || "No se pudo actualizar el estado.");
    else router.refresh();
  }

  return (
    <div className="finance-page">
      <section className="legacy-block">
        <div className="legacy-block-header"><h2>Tramos Eduardo / Tienda</h2></div>
        <form className="finance-form-grid" onSubmit={submitTranche}>
          <label className="legacy-field"><span>Desde utilidad neta</span><input name="desde" inputMode="numeric" required /></label>
          <label className="legacy-field"><span>% Eduardo</span><input name="porcentaje_eduardo" inputMode="decimal" placeholder="0.2" required /></label>
          <label className="legacy-field"><span>% Tienda</span><input name="porcentaje_tienda" inputMode="decimal" placeholder="0.8" /></label>
          <label className="legacy-field finance-field-wide"><span>Descripcion</span><input name="descripcion" /></label>
          <button className="primary-button inline-primary compact-button" type="submit" disabled={saving}><Plus size={16} />{saving ? "Guardando..." : "Agregar tramo"}</button>
        </form>
        {message ? <p className="save-status">{message}</p> : null}
      </section>

      <section className="panel section-gap">
        <div className="panel-header"><h2>Tramos configurados</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Desde</th><th>% Eduardo</th><th>% Tienda</th><th>Descripcion</th><th className="text-center">Estado</th><th></th></tr></thead>
            <tbody>
              {tranches.map((tranche) => (
                <tr key={tranche.id}>
                  <td>{formatMoney(tranche.desde)}</td>
                  <td>{Math.round(Number(tranche.porcentaje_eduardo || 0) * 100)}%</td>
                  <td>{Math.round(Number(tranche.porcentaje_tienda || 0) * 100)}%</td>
                  <td>{textOrDash(tranche.descripcion)}</td>
                  <td className="text-center"><span className={`pill ${tranche.estado ? "green" : "gray"}`}>{tranche.estado ? "Activo" : "Inactivo"}</span></td>
                  <td>
                    <button
                      className={`action-button ${tranche.estado ? "danger" : ""}`}
                      type="button"
                      title={tranche.estado ? "Deshabilitar" : "Reactivar"}
                      onClick={() => toggleTranche(tranche)}
                    >
                      {tranche.estado ? <Trash2 size={15} /> : <RotateCcw size={15} />}
                    </button>
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
