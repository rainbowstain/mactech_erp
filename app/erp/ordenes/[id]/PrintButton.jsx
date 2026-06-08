"use client";

export default function PrintButton({ label = "Imprimir" }) {
  return (
    <button className="primary-button inline-primary compact-button" type="button" onClick={() => window.print()}>
      {label}
    </button>
  );
}
