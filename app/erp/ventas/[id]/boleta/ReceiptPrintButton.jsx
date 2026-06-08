"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export default function ReceiptPrintButton({ auto = false, label = "Imprimir boleta" }) {
  useEffect(() => {
    if (!auto) return undefined;
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, [auto]);

  return (
    <button className="primary-button inline-primary compact-button" type="button" onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
