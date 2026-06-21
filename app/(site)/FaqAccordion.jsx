"use client";

/*
 * FaqAccordion — preguntas frecuentes plegables. Acordeón controlado: una
 * abierta a la vez, animación suave de altura con el truco grid-rows 0fr→1fr.
 */

import { useState } from "react";
import { Plus } from "lucide-react";

export default function FaqAccordion({ items }) {
  const [open, setOpen] = useState(-1);

  return (
    <div className="faq">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div className={`faq-item${isOpen ? " is-open" : ""}`} key={f.q}>
            <button
              type="button"
              className="faq-q"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              <span>{f.q}</span>
              <span className="faq-ic" aria-hidden="true">
                <Plus size={18} strokeWidth={2.2} />
              </span>
            </button>
            <div className="faq-a">
              <div className="faq-a-in">
                <p>{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
