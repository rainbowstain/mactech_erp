// Versión del sistema MacTech ERP — FUENTE ÚNICA.
// Subir este número en cada release (se ve en el sidebar del ERP y en la landing).
// El SHA del commit se inyecta automático en cada deploy de Vercel (ver next.config).
export const APP_VERSION = "1.5.2";
export const COMMIT_SHA = (process.env.NEXT_PUBLIC_COMMIT_SHA || "").slice(0, 7);
export const APP_VERSION_LABEL = COMMIT_SHA ? `v${APP_VERSION} · ${COMMIT_SHA}` : `v${APP_VERSION}`;
