"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, KeyRound, Plus, Save, ShieldCheck, Trash2, X } from "lucide-react";
import { formatDateTime, textOrDash } from "@/lib/format";

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
  const [message, setMessage] = useState("");
  const isEditing = Boolean(editing);

  const roleMap = useMemo(() => new Map(roles.map((role) => [role.value, role])), [roles]);

  function updateValue(key, value) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function openCreate() {
    setEditing(null);
    setValues(emptyValues());
    setMessage("");
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
    setMessage("");
  }

  function closeForm() {
    setEditing(null);
    setValues(emptyValues());
    setMessage("");
  }

  async function refreshUsers() {
    router.refresh();
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
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
      setMessage(isEditing ? "Usuario actualizado." : "Usuario creado.");
      setEditing(null);
      setValues(emptyValues());
      await refreshUsers();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function disableUser(user) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/erp/usuarios/${user.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo deshabilitar usuario.");

      setUsers((current) => current.map((row) => (row.id === payload.id ? payload : row)));
      setMessage("Usuario deshabilitado.");
      await refreshUsers();
    } catch (error) {
      setMessage(error.message);
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
            {message ? <p className="maintainer-message">{message}</p> : null}
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
        <div className="table-wrap users-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Actualizado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const role = roleMap.get(user.role);
                const isCurrentUser = Number(user.id) === Number(currentUserId);
                return (
                  <tr key={user.id}>
                    <td>
                      <strong>{textOrDash(user.name)}</strong>
                      {isCurrentUser ? <span className="subtext">Sesion actual</span> : null}
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`pill role-pill role-${user.role}`}>{role?.label || user.role}</span>
                    </td>
                    <td>
                      <span className={`pill ${user.estado ? "green" : "gray"}`}>
                        {user.estado ? "Activo" : "Deshabilitado"}
                      </span>
                    </td>
                    <td>{formatDateTime(user.updated_at || user.created_at)}</td>
                    <td className="text-center">
                      <div className="action-group">
                        <button className="action-button" type="button" title="Editar" onClick={() => openEdit(user)}>
                          <Edit3 size={15} aria-hidden="true" />
                        </button>
                        <button
                          className="action-button"
                          type="button"
                          title="Cambiar password"
                          onClick={() => openEdit(user)}
                        >
                          <KeyRound size={15} aria-hidden="true" />
                        </button>
                        <button
                          className="action-button danger"
                          type="button"
                          title="Deshabilitar"
                          disabled={saving || !user.estado}
                          onClick={() => disableUser(user)}
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!users.length ? (
                <tr>
                  <td className="empty-state" colSpan="6">
                    Sin usuarios registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
