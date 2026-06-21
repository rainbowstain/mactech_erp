"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export default function ReceiptPrintButton({ auto = false, label = "Imprimir boleta" }) {
  useEffect(() => {
    if (!auto) return undefined;
    const timer = window.setTimeout(async () => {
      await document.fonts?.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((image) => !image.complete)
          .map(
            (image) =>
              new Promise((resolve) => {
                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });
              })
          )
      );
      window.print();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [auto]);

  return (
    <button className="primary-button inline-primary compact-button" type="button" onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" />
      {label}
    </button>
  );
}
