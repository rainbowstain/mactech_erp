"use client";

/*
 * CommandCenter — "por qué elegirnos" como una pantalla COMPLETA negra que sube
 * y cubre el proceso morado. Años de Experiencia: barra de estado, dos contadores
 * grandes (garantía y equipos reparados) y los indicadores. Reveal de abajo
 * hacia arriba al entrar.
 */

import { useRef, useEffect, useLayoutEffect } from "react";
import { Check, ShieldCheck, Wrench } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function metaFor(item) {
  const t = item.toLowerCase();
  if (t.includes("herramient")) return "PRO";
  if (t.includes("apple")) return "APPLE";
  if (t.includes("repuesto") || t.includes("confiab")) return "CALIDAD";
  if (t.includes("cercan")) return "LOCAL";
  return "OK";
}

export default function CommandCenter({ items }) {
  const rootRef = useRef(null);
  const fillRef = useRef(null);
  const garantiaRef = useRef(null);
  const equiposRef = useRef(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    const revealEls = [...root.querySelectorAll(".cmd-rise")];
    const clamp01 = (value) => Math.max(0, Math.min(1, value));
    let counted = false;

    const setCounter = (el, value, fmt) => {
      if (!el) return;
      el.textContent = fmt(value);
    };

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Pin + relleno que sube de abajo hacia arriba (efecto cover), desktop y
      // móvil. En móvil el contenido cabe en una pantalla (layout 2 columnas).
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const update = (p) => {
          const reveal = clamp01((p - 0.34) / 0.66);
          root.style.setProperty("--cmd-progress", p.toFixed(4));
          root.style.setProperty("--cmd-reveal", reveal.toFixed(4));
          if (fill) fill.style.height = `${(p * 100).toFixed(2)}%`;
          revealEls.forEach((el, i) => {
            const threshold = 1 - (i + 1) / Math.max(1, revealEls.length);
            el.classList.toggle("is-on", reveal >= threshold);
          });
          setCounter(garantiaRef.current, 90, (v) => String(Math.round(v)));
          setCounter(equiposRef.current, 4000 * reveal, (v) =>
            Math.round(v).toLocaleString("es-CL")
          );
          if (reveal > 0.72) counted = true;
        };

        update(0);
        const st = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "+=175%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => update(self.progress),
          onLeave: () => {
            if (!counted) update(1);
          },
        });

        return () => st.kill();
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        root.style.setProperty("--cmd-progress", "1");
        root.style.setProperty("--cmd-reveal", "1");
        if (fill) fill.style.height = "100%";
        revealEls.forEach((el) => el.classList.add("is-on"));
        if (garantiaRef.current) garantiaRef.current.textContent = "90";
        if (equiposRef.current) equiposRef.current.textContent = (4000).toLocaleString("es-CL");
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="command" ref={rootRef} aria-label="Por qué elegirnos">
      <div className="command-fill" ref={fillRef} aria-hidden="true" />
      <div className="cmd-screen">
        <div className="cmd-top cmd-rise">
          <div className="cmd-head">
            <p className="kicker">Por qué elegirnos</p>
            <h2>Años de Experiencia</h2>
          </div>
        </div>

        <div className="cmd-stats">
          <div className="cmd-stat cmd-rise">
            <span className="cmd-stat-icon" aria-hidden="true">
              <ShieldCheck size={22} strokeWidth={1.8} />
            </span>
            <span className="cmd-stat-num">
              <span ref={garantiaRef}>90</span>
              <span className="cmd-stat-unit">días</span>
            </span>
            <span className="cmd-stat-label">Garantía estándar de 3 meses</span>
            <span className="cmd-stat-note">30 días para reparaciones en placa.</span>
          </div>
          <div className="cmd-stat cmd-rise">
            <span className="cmd-stat-icon" aria-hidden="true">
              <Wrench size={22} strokeWidth={1.8} />
            </span>
            <span className="cmd-stat-num">
              <span ref={equiposRef}>4.000</span>
              <span className="cmd-stat-unit">+</span>
            </span>
            <span className="cmd-stat-label">Equipos reparados en Arica</span>
          </div>
        </div>

        <div className="cmd-grid cmd-rise">
          {items.map((item) => (
            <div className="cmd-cell" key={item}>
              <span className="cmd-check" aria-hidden="true">
                <Check size={14} strokeWidth={2.6} />
              </span>
              <span className="cmd-label">{item}</span>
              <span className="cmd-meta">{metaFor(item)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
