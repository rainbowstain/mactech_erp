"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { notifyWarning, notifySuccess } from "@/lib/notify";

export default function WarrantyButton({ orderId, active }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function toggleWarranty() {
    setSaving(true);
    try {
      const response = await fetch(`/api/erp/ordenes/${orderId}/garantia`, { method: active ? "DELETE" : "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo actualizar la garantia.");
      notifySuccess(active ? "Garantia desactivada." : "Garantia activada.");
      router.refresh();
    } catch (error) {
      notifyWarning(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      className="action-button"
      type="button"
      disabled={saving}
      onClick={toggleWarranty}
      title={active ? "Desactivar garantia" : "Activar garantia"}
    >
      {active ? <ShieldOff size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}
      {saving ? "..." : active ? "Desactivar garantía" : "Activar garantía"}
    </button>
  );
}
