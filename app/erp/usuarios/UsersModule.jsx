"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, KeyRound, Plus, RotateCcw, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { formatDateTime, textOrDash } from "@/lib/format";
import { notifyWarning, notifySuccess } from "@/lib/notify";
import DataTable from "../DataTable";

function emptyValues() {
  return {
    name: "",
    email: "",
    role: "tecnico",
    estado: "true",
    password: "",
  };
}

export default function UsersModule({ initialUsers, roles, currentUserId }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState(emptyValues);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(editing);

  const roleMap = useMemo(() => new Map(roles.map((role) => [role.value, role])), [roles]);

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setValues(emptyValues());
  }

  function openEdit(user) {
    setEditing(user);
    setValues({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "tecnico",
      estado: String(Boolean(user.estado)),
      password: "",
    });
  }

  function closeForm() {
    setEditing(null);
    setValues(emptyValues());
  }

  async function refreshUsers() {
    router.refresh();
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(isEditing ? `/api/erp/usuarios/${editing.id}` : "/api/erp/usuarios", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo guardar usuario.");

      setUsers((current) => {
        if (!isEditing) return [payload, ...current];
        return current.map((user) => (user.id === payload.id ? payload : user));
      });
      notifySuccess(isEditing ? "Usuario actualizado." : "Usuario creado.");
      setEditing(null);
      setValues(emptyValues());
      await refreshUsers();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserStatus(user) {
    const nextEstado = !user.estado;
    setSaving(true);
    try {
      const response = await fetch(`/api/erp/usuarios/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nextEstado }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo actualizar usuario.");

      setUsers((current) => current.map((row) => (row.id === payload.id ? payload : row)));
      notifySuccess(nextEstado ? "Usuario reactivado." : "Usuario deshabilitado.");
      await refreshUsers();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="users-page">
      <section className="panel legacy-block">
        <div className="panel-header panel-header-wrap">
          <h2>Administrar usuarios</h2>
          <button className="primary-button compact-button inline-primary" type="button" onClick={openCreate}>
            <Plus size={16} aria-hidden="true" />
            Nuevo usuario
          </button>
        </div>

        <form className="maintainer-form" onSubmit={saveUser}>
          <div className="maintainer-form-heading">
            <strong>{isEditing ? "Editar usuario" : "Crear usuario"}</strong>
            {isEditing ? <span>#{editing.id}</span> : null}
          </div>
          <div className="maintainer-form-grid users-form-grid">
            <label className="legacy-field">
              <span>Nombre *</span>
              <input value={values.name} onChange={(event) => updateValue("name", event.target.value)} required />
            </label>
            <label className="legacy-field">
              <span>Email *</span>
              <input
                type="email"
                value={values.email}
                onChange={(event) => updateValue("email", event.target.value)}
                required
              />
            </label>
            <label className="legacy-field">
              <span>Rol</span>
              <select value={values.role} onChange={(event) => updateValue("role", event.target.value)}>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="legacy-field">
              <span>Estado</span>
              <select value={values.estado} onChange={(event) => updateValue("estado", event.target.value)}>
                <option value="true">Activo</option>
                <option value="false">Deshabilitado</option>
              </select>
            </label>
            <label className="legacy-field users-password-field">
              <span>{isEditing ? "Nuevo password" : "Password *"}</span>
              <input
                type="password"
                value={values.password}
                onChange={(event) => updateValue("password", event.target.value)}
                required={!isEditing}
                minLength={isEditing && !values.password ? undefined : 6}
                placeholder={isEditing ? "Dejar en blanco para mantener" : ""}
              />
            </label>
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
      </section>

      <section className="panel section-gap">
        <div className="panel-header">
          <h2>Roles y permisos</h2>
        </div>
        <div className="users-role-grid">
          {roles.map((role) => (
            <article className="user-role-card" key={role.value}>
              <div>
                <ShieldCheck size={18} aria-hidden="true" />
                <strong>{role.label}</strong>
              </div>
              <p>{role.description}</p>
              <span>{role.permissions.join(" / ")}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="panel section-gap">
        <div className="panel-header">
          <h2>Cuentas actuales</h2>
        </div>
        <DataTable
          rows={users}
          emptyMessage="Sin usuarios registrados."
          columns={[
            {
              key: "name",
              label: "Usuario",
              value: (user) => `${user.name || ""} ${Number(user.id) === Number(currentUserId) ? "Sesion actual" : ""}`,
              render: (user) => (
                <>
                  <strong>{textOrDash(user.name)}</strong>
                  {Number(user.id) === Number(currentUserId) ? <span className="subtext">Sesion actual</span> : null}
                </>
              ),
            },
            { key: "email", label: "Email" },
            {
              key: "role",
              label: "Rol",
              value: (user) => roleMap.get(user.role)?.label || user.role,
              filterOptions: roles.map((role) => ({ value: role.label, label: role.label })),
              render: (user) => {
                const role = roleMap.get(user.role);
                return <span className={`pill role-pill role-${user.role}`}>{role?.label || user.role}</span>;
              },
            },
            {
              key: "estado",
              label: "Estado",
              value: (user) => (user.estado ? "Activo" : "Deshabilitado"),
              filterOptions: [
                { value: "Activo", label: "Activo" },
                { value: "Deshabilitado", label: "Deshabilitado" },
              ],
              render: (user) => (
                <span className={`pill ${user.estado ? "green" : "gray"}`}>{user.estado ? "Activo" : "Deshabilitado"}</span>
              ),
            },
            {
              key: "updated_at",
              label: "Actualizado",
              value: (user) => formatDateTime(user.updated_at || user.created_at),
              render: (user) => formatDateTime(user.updated_at || user.created_at),
            },
            {
              key: "actions",
              label: "Acciones",
              align: "center",
              filter: false,
              render: (user) => (
                <div className="action-group">
                  <button className="action-button" type="button" title="Editar" onClick={() => openEdit(user)}>
                    <Edit3 size={15} aria-hidden="true" />
                  </button>
                  <button className="action-button" type="button" title="Cambiar password" onClick={() => openEdit(user)}>
                    <KeyRound size={15} aria-hidden="true" />
                  </button>
                  <button
                    className={`action-button ${user.estado ? "danger" : ""}`}
                    type="button"
                    title={user.estado ? "Deshabilitar" : "Reactivar"}
                    disabled={saving}
                    onClick={() => toggleUserStatus(user)}
                  >
                    {user.estado ? <Trash2 size={15} aria-hidden="true" /> : <RotateCcw size={15} aria-hidden="true" />}
                  </button>
                </div>
              ),
            },
          ]}
        />
      </section>
    </div>
  );
}
