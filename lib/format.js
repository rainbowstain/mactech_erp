export function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";
  return new Intl.DateTimeFormat("es-CL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatMoney(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function textOrDash(value) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

const ORDER_STATUS_PILL_CLASS = {
  1: "gray", // Ingresado
  2: "yellow", // En revision
  3: "blue", // Para retiro
  4: "red", // Garantia
  5: "green", // Entregado
  6: "orange", // Espera repuesto
};

export function orderStatusPillClass(estado) {
  return ORDER_STATUS_PILL_CLASS[Number(estado)] || "";
}
