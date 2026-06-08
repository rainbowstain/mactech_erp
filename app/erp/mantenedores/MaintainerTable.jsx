"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { formatMoney, textOrDash } from "@/lib/format";

function formatValue(value, type) {
  if (type === "money") return formatMoney(value);
  if (type === "status") return Number(value) === 1 ? "Habilitado" : "Deshabilitado";
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
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(() => emptyValues(fields));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const isEditing = Boolean(editing);
  const formTitle = isEditing ? `Editar ${title}` : addLabel;

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
    setMessage("");
  }

  function openEdit(row) {
    const nextValues = emptyValues(fields);
    for (const field of fields) {
      nextValues[field.key] = row[field.key] ?? field.defaultValue ?? "";
    }
    setEditing(row);
    setValues(nextValues);
    setMessage("");
  }

  function closeForm() {
    setEditing(null);
    setValues(emptyValues(fields));
    setMessage("");
  }

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function saveRecord(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

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

      setMessage(isEditing ? "Registro actualizado." : "Registro agregado.");
      setEditing(null);
      setValues(emptyValues(fields));
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function disableRecord(row) {
    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/erp/mantenedores/${resource}/${row.id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo deshabilitar.");

      setMessage("Registro deshabilitado.");
      router.refresh();
    } catch (error) {
      setMessage(error.message);
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
        onChange={(event) =>
          updateValue(
            field.key,
            field.type === "money" || field.type === "number" ? event.target.value.replace(/\D/g, "") : event.target.value
          )
        }
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
          <input name="q" defaultValue={search} placeholder="Search..." />
          <button className="ghost-button compact-button" type="submit">
            Buscar
          </button>
          <button className="primary-button compact-button inline-primary" type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            {addLabel}
          </button>
        </form>
      </div>

      <form className="maintainer-form" onSubmit={saveRecord}>
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
          {message ? <p className="maintainer-message">{message}</p> : null}
        </div>
      </form>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="text-center">N</th>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "center" ? "text-center" : undefined}>
                  {column.label}
                </th>
              ))}
              <th className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={row.id}>
                  <td className="text-center">{index + 1}</td>
                  {columns.map((column) => (
                    <td key={column.key} className={column.align === "center" ? "text-center" : undefined}>
                      {column.type === "status" ? (
                        <span className={`pill ${Number(row[column.key]) === 1 ? "green" : "gray"}`}>
                          {formatValue(row[column.key], column.type)}
                        </span>
                      ) : column.type === "select" ? (
                        selectedLabelMaps[column.key]?.get(String(row[column.key])) || textOrDash(row[column.key])
                      ) : (
                        formatValue(row[column.key], column.type)
                      )}
                    </td>
                  ))}
                  <td className="text-center">
                    <div className="action-group">
                      <button className="action-button" type="button" title="Editar" onClick={() => openEdit(row)}>
                        <Edit3 size={15} aria-hidden="true" />
                      </button>
                      <button
                        className="action-button danger"
                        type="button"
                        title="Deshabilitar"
                        disabled={saving || Number(row.estado) === 0}
                        onClick={() => disableRecord(row)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="empty-state" colSpan={columns.length + 2}>
                  Sin registros para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
