"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";

export default function WarrantyButton({ orderId }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function activateWarranty() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/erp/ordenes/${orderId}/garantia`, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "No se pudo activar garantia.");
      router.push(`/erp/ordenes?tab=revision&idOrden=${orderId}`);
      router.refresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="warranty-action">
      <button className="primary-button inline-primary compact-button" type="button" disabled={saving} onClick={activateWarranty}>
        <ShieldCheck size={16} aria-hidden="true" />
        {saving ? "Activando..." : "Activar garantia"}
      </button>
      {message ? <p className="maintainer-message">{message}</p> : null}
    </div>
  );
}
