// RUT/RUN chileno — fuente unica de formateo y normalizacion.
// Formato canonico de salida: puntos de miles + guion antes del digito
// verificador, verificador en mayuscula si es K (ej: "10.000.000-1").

export function cleanRut(value) {
  return String(value || "")
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
}

export function formatRut(value) {
  const clean = cleanRut(value);
  if (!clean) return "";
  const body = clean.slice(0, -1);
  const verifier = clean.slice(-1);
  if (!body) return verifier;
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${verifier}`;
}

// Clave de comparacion: sin puntuacion y en minuscula, para que un RUT
// encuentre coincidencia sin importar como se escribio o como quedo guardado.
export function rutSearchKey(value) {
  return cleanRut(value).toLowerCase();
}
