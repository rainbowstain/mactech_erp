import { query } from "@/lib/db";

export async function getMaintainerStats() {
  const result = await query(`
    select
      (select count(*)::int from clientes) as clientes,
      (select count(*)::int from equipos) as equipos,
      (select count(*)::int from dispositivos) as dispositivos,
      (select count(*)::int from servicios) as servicios,
      (select count(*)::int from preguntas) as preguntas
  `);
  return result.rows[0];
}

export async function getClients({ search = "" } = {}) {
  const params = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where = "where nombre ilike $1 or run ilike $1 or mail ilike $1 or fono ilike $1";
  }
  const result = await query(
    `select id, nombre, run, mail, fono, estado from clientes ${where} order by id desc limit 300`,
    params
  );
  return result.rows;
}

export async function getEquipment({ search = "" } = {}) {
  const params = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where = "where nombre ilike $1";
  }
  const result = await query(
    `select id, nombre, estado from equipos ${where} order by nombre asc limit 300`,
    params
  );
  return result.rows;
}

export async function getDevices({ search = "" } = {}) {
  const params = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where = "where d.nombre ilike $1 or e.nombre ilike $1";
  }
  const result = await query(
    `
      select d.id, d.nombre, d.modelo, d.estado, e.nombre as equipo_nombre
      from dispositivos d
      left join equipos e on e.id = d.modelo
      ${where}
      order by e.nombre asc nulls last, d.nombre asc
      limit 400
    `,
    params
  );
  return result.rows;
}

export async function getDeviceStates() {
  const result = await query("select id, nombre from estado_equipos order by id asc");
  return result.rows;
}

export async function getServices({ search = "" } = {}) {
  const params = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where = "where nombre ilike $1";
  }
  const result = await query(
    `select id, nombre, precio, coalesce(costo, 0) as costo, estado from servicios ${where} order by nombre asc limit 300`,
    params
  );
  return result.rows;
}

export async function getQuestions({ search = "" } = {}) {
  const params = [];
  let where = "";
  if (search.trim()) {
    params.push(`%${search.trim()}%`);
    where = "where descripcion ilike $1";
  }
  const result = await query(
    `select id, descripcion, estado from preguntas ${where} order by id asc limit 300`,
    params
  );
  return result.rows;
}
