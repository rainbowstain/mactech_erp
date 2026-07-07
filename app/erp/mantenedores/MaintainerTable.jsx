"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { formatMoney, textOrDash } from "@/lib/format";
import { notifyWarning, notifySuccess } from "@/lib/notify";
import { formatRut } from "@/lib/rut";
import DataTable from "../DataTable";

function formatValue(value, type) {
  if (type === "money") return formatMoney(value);
  if (type === "status") return Number(value) === 1 ? "Habilitado" : "Deshabilitado";
  if (type === "rut") return textOrDash(formatRut(value));
  return textOrDash(value);
}

function emptyValues(fields) {
  return fields.reduce((values, field) => {
    values[field.key] = field.defaultValue ?? (field.type === "status" ? 1 : "");
    return values;
  }, {});
}

export default function MaintainerTable({ title, rows, columns, fields, resource, search, addLabel = "Agregar" }) {
  const router = useRouter();
  const formRef = useRef(null);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(() => emptyValues(fields));
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(editing);
  const formTitle = isEditing ? `Editar ${title}` : addLabel;
  const activeRows = rows.filter((row) => Number(row.estado) !== 0).length;
  const inactiveRows = rows.length - activeRows;

  const selectedLabelMaps = useMemo(() => {
    const maps = {};
    for (const field of fields) {
      if (!field.options) continue;
      maps[field.key] = new Map(field.options.map((option) => [String(option.value), option.label]));
    }
    return maps;
  }, [fields]);

  function openCreate() {
    setEditing(null);
    setValues(emptyValues(fields));
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openEdit(row) {
    const nextValues = emptyValues(fields);
    for (const field of fields) {
      const raw = row[field.key] ?? field.defaultValue ?? "";
      nextValues[field.key] = field.type === "rut" ? formatRut(raw) || raw : raw;
    }
    setEditing(row);
    setValues(nextValues);
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function closeForm() {
    setEditing(null);
    setValues(emptyValues(fields));
  }

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true);

    const endpoint = isEditing
      ? `/api/erp/mantenedores/${resource}/${editing.id}`
      : `/api/erp/mantenedores/${resource}`;

    try {
      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar.");

      notifySuccess(isEditing ? "Registro actualizado." : "Registro agregado.");
      setEditing(null);
      setValues(emptyValues(fields));
      router.refresh();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRecord(row) {
    const nextEstado = Number(row.estado) === 1 ? 0 : 1;
    setSaving(true);

    try {
      const response = await fetch(`/api/erp/mantenedores/${resource}/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nextEstado }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo actualizar el estado.");

      notifySuccess(nextEstado ? "Registro reactivado." : "Registro deshabilitado.");
      router.refresh();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  function renderField(field) {
    const value = values[field.key] ?? "";

    if (field.type === "status") {
      return (
        <select value={value} onChange={(event) => updateValue(field.key, event.target.value)}>
          <option value={1}>Habilitado</option>
          <option value={0}>Deshabilitado</option>
        </select>
      );
    }

    if (field.type === "select") {
      return (
        <select value={value} onChange={(event) => updateValue(field.key, event.target.value)} required={field.required}>
          <option value="">Seleccione</option>
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(event) => updateValue(field.key, event.target.value)}
          required={field.required}
          rows={3}
        />
      );
    }

    return (
      <input
        inputMode={field.type === "money" || field.type === "number" ? "numeric" : undefined}
        value={value}
        onChange={(event) => {
          const raw = event.target.value;
          if (field.type === "money" || field.type === "number") updateValue(field.key, raw.replace(/\D/g, ""));
          else if (field.type === "rut") updateValue(field.key, formatRut(raw));
          else updateValue(field.key, raw);
        }}
        required={field.required}
      />
    );
  }

  return (
    <section className="panel legacy-block">
      <div className="panel-header panel-header-wrap">
        <h2>{title}</h2>
        <form className="search-form">
          <input type="hidden" name="tipo" value={resource} />
          <input name="q" defaultValue={search} placeholder="Buscar..." />
          <button className="ghost-button compact-button" type="submit">
            Buscar
          </button>
          <button className="primary-button compact-button inline-primary" type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            {addLabel}
          </button>
        </form>
      </div>

      <form className="maintainer-form" onSubmit={saveRecord} ref={formRef}>
        <div className="maintainer-form-heading">
          <strong>{formTitle}</strong>
          {isEditing ? <span>#{editing.id}</span> : null}
        </div>
        <div className="maintainer-form-grid">
          {fields.map((field) => (
            <label className={`legacy-field ${field.wide ? "legacy-field-form-wide" : ""}`} key={field.key}>
              <span>
                {field.label}
                {field.required ? " *" : ""}
              </span>
              {renderField(field)}
            </label>
          ))}
        </div>
        <div className="maintainer-actions">
          <button className="primary-button compact-button inline-primary" type="submit" disabled={saving}>
            <Save size={16} aria-hidden="true" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button className="ghost-button compact-button" type="button" onClick={closeForm} disabled={saving}>
            <X size={16} aria-hidden="true" />
            Limpiar
          </button>
        </div>
      </form>

      <div className="maintainer-summary-grid">
        <div><span>Total</span><strong>{rows.length}</strong></div>
        <div><span>Activos</span><strong>{activeRows}</strong></div>
        <div><span>Inactivos</span><strong>{inactiveRows}</strong></div>
      </div>

      <DataTable
        rows={rows}
        emptyMessage="Sin registros para mostrar."
        columns={[
          { key: "number", label: "N", align: "center", filter: false, value: (row) => rows.indexOf(row) + 1 },
          ...columns.map((column) => ({
            ...column,
            value: (row) =>
              column.type === "select"
                ? selectedLabelMaps[column.key]?.get(String(row[column.key])) || row[column.key]
                : formatValue(row[column.key], column.type),
            filterOptions:
              column.type === "status"
                ? [
                    { value: "Habilitado", label: "Habilitado" },
                    { value: "Deshabilitado", label: "Deshabilitado" },
                  ]
                : undefined,
            render: (row) =>
              column.type === "status" ? (
                <span className={`pill ${Number(row[column.key]) === 1 ? "green" : "gray"}`}>
                  {formatValue(row[column.key], column.type)}
                </span>
              ) : column.type === "select" ? (
                selectedLabelMaps[column.key]?.get(String(row[column.key])) || textOrDash(row[column.key])
              ) : (
                formatValue(row[column.key], column.type)
              ),
          })),
          {
            key: "actions",
            label: "Acciones",
            align: "center",
            filter: false,
            render: (row) => (
              <div className="action-group">
                <button className="action-button" type="button" title="Editar" onClick={() => openEdit(row)}>
                  <Edit3 size={15} aria-hidden="true" />
                </button>
                {Number(row.estado) === 1 ? (
                <button
                  className="action-button danger"
                  type="button"
                  title="Deshabilitar"
                  disabled={saving}
                  onClick={() => toggleRecord(row)}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
                ) : (
                  <button
                    className="action-button"
                    type="button"
                    title="Reactivar"
                    disabled={saving}
                    onClick={() => toggleRecord(row)}
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </section>
  );
}
