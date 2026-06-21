import bcrypt from "bcryptjs";
import { query, transaction } from "@/lib/db";

export const USER_ROLES = [
  {
    value: "admin",
    label: "Admin",
    description: "Acceso completo al ERP, usuarios, finanzas, ventas, taller e inventario.",
    permissions: ["Todo el sistema", "Usuarios", "Finanzas", "Ventas", "OT", "Inventario", "Mantenedores"],
  },
  {
    value: "finanzas",
    label: "Finanzas",
    description: "Control financiero, reportes, gastos, tramos y lectura de ventas/OT.",
    permissions: ["Finanzas", "Gastos", "Reportes", "Lectura de ventas", "Lectura de OT"],
  },
  {
    value: "tecnico",
    label: "Tecnico",
    description: "Operacion de taller: OT, revision, repuestos y protocolos.",
    permissions: ["OT", "Revision", "Inventario taller", "Protocolos"],
  },
  {
    value: "ventas",
    label: "Ventas",
    description: "Venta de productos, clientes, boletas e inventario de productos.",
    permissions: ["Ventas", "Clientes", "Boletas", "Inventario productos"],
  },
  {
    value: "developer",
    label: "Developer",
    description: "Soporte tecnico del sistema, usuarios, configuracion y acceso de diagnostico.",
    permissions: ["Usuarios", "Configuracion", "Mantenedores", "Diagnostico", "Acceso tecnico"],
  },
];

const ROLE_VALUES = new Set(USER_ROLES.map((role) => role.value));
const USER_MANAGERS = new Set(["admin", "developer"]);

export function normalizeUserRole(value) {
  const role = String(value || "").trim().toLowerCase();
  return ROLE_VALUES.has(role) ? role : "tecnico";
}

export function canManageUsers(session) {
  return USER_MANAGERS.has(normalizeUserRole(session?.role));
}

function asText(value) {
  return String(value || "").trim();
}

function asBoolean(value, fallback = true) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function cleanEmail(value) {
  return asText(value).toLowerCase();
}

function validateUserPayload(payload, { requirePassword = false } = {}) {
  if (!payload.name) return "Ingrese nombre.";
  if (!payload.email || !payload.email.includes("@")) return "Ingrese un email valido.";
  if (requirePassword && !payload.password) return "Ingrese password.";
  if (payload.password && payload.password.length < 6) return "El password debe tener al menos 6 caracteres.";
  return null;
}

export async function getUsers() {
  const result = await query(
    `
      select id, name, email, role, estado, created_at, updated_at
      from users
      order by estado desc, role asc, name asc, id asc
    `
  );
  return result.rows;
}

export async function createUser(body) {
  const payload = {
    name: asText(body.name),
    email: cleanEmail(body.email),
    role: normalizeUserRole(body.role),
    estado: asBoolean(body.estado, true),
    password: String(body.password || ""),
  };
  const validation = validateUserPayload(payload, { requirePassword: true });
  if (validation) throw new Error(validation);

  const hash = await bcrypt.hash(payload.password, 10);
  const result = await query(
    `
      insert into users (name, email, role, estado, password, updated_at)
      values ($1, $2, $3, $4, $5, now())
      returning id, name, email, role, estado, created_at, updated_at
    `,
    [payload.name, payload.email, payload.role, payload.estado, hash]
  );
  return result.rows[0];
}

async function isLastActiveAdmin(db, id) {
  const result = await db.query(
    `
      select count(*)::int as total
      from users
      where role = 'admin' and estado = true and id <> $1
    `,
    [id]
  );
  return Number(result.rows[0]?.total || 0) === 0;
}

export async function updateUser(id, body) {
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) throw new Error("ID invalido.");

  const payload = {
    name: asText(body.name),
    email: cleanEmail(body.email),
    role: normalizeUserRole(body.role),
    estado: asBoolean(body.estado, true),
    password: String(body.password || ""),
  };
  const validation = validateUserPayload(payload);
  if (validation) throw new Error(validation);

  return transaction(async (db) => {
    const currentResult = await db.query("select id, role, estado from users where id = $1 for update", [userId]);
    const current = currentResult.rows[0];
    if (!current) throw new Error("Usuario no encontrado.");

    const wouldLoseLastAdmin =
      current.role === "admin" &&
      current.estado === true &&
      (payload.role !== "admin" || payload.estado !== true) &&
      (await isLastActiveAdmin(db, userId));
    if (wouldLoseLastAdmin) throw new Error("No puedes quitar o desactivar el ultimo admin activo.");

    const values = [payload.name, payload.email, payload.role, payload.estado, userId];
    let passwordSql = "";
    if (payload.password) {
      const hash = await bcrypt.hash(payload.password, 10);
      values.splice(4, 0, hash);
      passwordSql = ", password = $5";
    }

    const idParam = values.length;
    const result = await db.query(
      `
        update users
        set name = $1, email = $2, role = $3, estado = $4${passwordSql}, updated_at = now()
        where id = $${idParam}
        returning id, name, email, role, estado, created_at, updated_at
      `,
      values
    );
    return result.rows[0];
  });
}

export async function disableUser(id) {
  return setUserStatus(id, false);
}

export async function setUserStatus(id, estado) {
  return updateUser(id, { ...(await getUserForUpdate(id)), estado });
}

async function getUserForUpdate(id) {
  const result = await query("select name, email, role, estado from users where id = $1 limit 1", [id]);
  if (!result.rows[0]) throw new Error("Usuario no encontrado.");
  return result.rows[0];
}
