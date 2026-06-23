"use client";

// Sistema único de alertas del ERP (toasts) + confirmaciones.
// Colores por tipo (ver <Toaster richColors /> en app/Providers.jsx):
//   éxito -> verde, aviso -> amarillo, peligro/error -> rojo.
import { toast } from "sonner";

export function notifySuccess(message, options) {
  return toast.success(message, options);
}

// Aviso / situación negativa pero no destructiva (amarillo).
export function notifyWarning(message, options) {
  return toast.warning(message, options);
}

// Error / acción peligrosa (rojo).
export function notifyError(message, options) {
  return toast.error(message, options);
}

export function notifyInfo(message, options) {
  return toast(message, options);
}

export function dismissNotify(id) {
  return toast.dismiss(id);
}

// ----- Confirmación imperativa (Continuar / Cancelar) -----
// Store mínimo para poder llamar confirmAction() desde cualquier handler.
let confirmState = null;
const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeConfirm(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getConfirmState() {
  return confirmState;
}

/**
 * Muestra un diálogo modal y resuelve a true (Continuar) o false (Cancelar).
 * Usar danger: true para acciones destructivas (botón rojo).
 */
export function confirmAction({
  title = "¿Confirmar acción?",
  message = "",
  confirmLabel = "Continuar",
  cancelLabel = "Cancelar",
  danger = false,
} = {}) {
  return new Promise((resolve) => {
    confirmState = {
      title,
      message,
      confirmLabel,
      cancelLabel,
      danger,
      resolve: (value) => {
        confirmState = null;
        emit();
        resolve(value);
      },
    };
    emit();
  });
}
