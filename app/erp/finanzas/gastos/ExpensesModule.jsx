"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { formatMoney, textOrDash } from "@/lib/format";

const TYPES = [
  { value: "operativo", label: "Operativo" },
  { value: "publicidad", label: "Publicidad" },
  { value: "compra", label: "Compra / inversion" },
  { value: "otro", label: "Otro" },
];

export default function ExpensesModule({ expenses, recurring, year, month }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  async function submitExpense(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/erp/finanzas/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar.");
      event.currentTarget.reset();
      setMessage("Gasto registrado.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitRecurring(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/erp/finanzas/recurrentes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar.");
      event.currentTarget.reset();
      setMessage("Gasto recurrente registrado.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function disable(endpoint, id) {
    setMessage("");
    const response = await fetch(`${endpoint}?id=${id}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) setMessage(payload.message || "No se pudo deshabilitar.");
    else router.refresh();
  }

  return (
    <div className="finance-page">
      <section className="legacy-block">
        <div className="legacy-block-header"><h2>Registrar Gasto</h2></div>
        <form className="finance-form-grid" onSubmit={submitExpense}>
          <label className="legacy-field"><span>Fecha</span><input type="date" name="fecha" defaultValue={`${year}-${String(month).padStart(2, "0")}-01`} /></label>
          <label className="legacy-field"><span>Categoria</span><input name="categoria" required placeholder="Arriendo, luz, publicidad..." /></label>
          <label className="legacy-field"><span>Tipo</span><select name="tipo">{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className="legacy-field"><span>Monto</span><input name="monto" inputMode="numeric" required /></label>
          <label className="legacy-field finance-field-wide"><span>Descripcion</span><input name="descripcion" /></label>
          <button className="primary-button inline-primary compact-button" disabled={saving} type="submit"><Plus size={16} />Agregar gasto</button>
        </form>
      </section>

      <section className="legacy-block section-gap">
        <div className="legacy-block-header"><h2>Gasto Recurrente</h2></div>
        <form className="finance-form-grid" onSubmit={submitRecurring}>
          <label className="legacy-field"><span>Categoria</span><input name="categoria" required /></label>
          <label className="legacy-field"><span>Tipo</span><select name="tipo">{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label className="legacy-field"><span>Dia</span><input name="dia" inputMode="numeric" defaultValue="1" /></label>
          <label className="legacy-field"><span>Monto</span><input name="monto" inputMode="numeric" required /></label>
          <label className="legacy-field finance-field-wide"><span>Descripcion</span><input name="descripcion" /></label>
          <button className="primary-button inline-primary compact-button" disabled={saving} type="submit"><Plus size={16} />Agregar recurrente</button>
        </form>
        {message ? <p className="save-status">{message}</p> : null}
      </section>

      <section className="panel section-gap">
        <div className="panel-header"><h2>Gastos del mes</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoria</th><th>Descripcion</th><th>Monto</th><th className="text-center">Estado</th><th></th></tr></thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{new Date(expense.fecha).toLocaleDateString("es-CL")}</td>
                  <td>{expense.tipo}</td>
                  <td>{expense.categoria}</td>
                  <td>{textOrDash(expense.descripcion)}</td>
                  <td>{formatMoney(expense.monto)}</td>
                  <td className="text-center"><span className={`pill ${expense.estado ? "green" : "gray"}`}>{expense.estado ? "Activo" : "Inactivo"}</span></td>
                  <td><button className="action-button danger" type="button" onClick={() => disable("/api/erp/finanzas/gastos", expense.id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel section-gap">
        <div className="panel-header"><h2>Recurrentes</h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Dia</th><th>Tipo</th><th>Categoria</th><th>Descripcion</th><th>Monto</th><th className="text-center">Estado</th><th></th></tr></thead>
            <tbody>
              {recurring.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.dia}</td>
                  <td>{expense.tipo}</td>
                  <td>{expense.categoria}</td>
                  <td>{textOrDash(expense.descripcion)}</td>
                  <td>{formatMoney(expense.monto)}</td>
                  <td className="text-center"><span className={`pill ${expense.estado ? "green" : "gray"}`}>{expense.estado ? "Activo" : "Inactivo"}</span></td>
                  <td><button className="action-button danger" type="button" onClick={() => disable("/api/erp/finanzas/recurrentes", expense.id)}><Trash2 size={15} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
