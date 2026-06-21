"use client";

/*
 * ProcessRoute — el proceso vive dentro de la "barra morada": una sección
 * pinneada cuyo panel morado se llena de IZQUIERDA A DERECHA con el scroll
 * hasta cubrir toda la pantalla, revelando los pasos 01 → 04 a su paso.
 * El texto va en claro para leerse sobre el morado. Sin JS / reduced-motion:
 * morado completo y pasos visibles.
 */

import { useRef, useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function ProcessRoute({ steps }) {
  const sectionRef = useRef(null);
  const fillRef = useRef(null);
  const railRef = useRef(null);
  const runnerRef = useRef(null);

  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    const fill = fillRef.current;
    const rail = railRef.current;
    const runner = runnerRef.current;
    const stepEls = [...section.querySelectorAll(".proc-step")];
    const nodeEls = [...section.querySelectorAll(".proc-point")];
    const thresholds = steps.map((_, i) => (steps.length === 1 ? 0 : i / (steps.length - 1)));
    const clamp01 = (value) => Math.max(0, Math.min(1, value));

    const activate = (p) => {
      const reveal = clamp01((p - 0.46) / 0.54);
      section.style.setProperty("--proc-progress", p.toFixed(4));
      section.style.setProperty("--proc-reveal", reveal.toFixed(4));
      if (fill) fill.style.width = `${(p * 100).toFixed(2)}%`;
      if (rail) rail.style.width = `${(reveal * 100).toFixed(2)}%`;
      if (runner) runner.style.left = `${(reveal * 100).toFixed(2)}%`;

      stepEls.forEach((el, i) => {
        const on = reveal >= Math.max(0, thresholds[i] - 0.03);
        el.classList.toggle("is-on", on);
      });
      nodeEls.forEach((el, i) => {
        const on = reveal >= Math.max(0, thresholds[i] - 0.03);
        el.classList.toggle("is-on", on);
      });
    };

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Pin + wipe morado de izquierda a derecha (efecto cover), desktop y móvil.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        activate(0);
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "+=195%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            activate(self.progress);
          },
        });
        return () => st.kill();
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        activate(1);
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="proc" id="proceso" ref={sectionRef} aria-label="El proceso, paso a paso">
      <div className="proc-backdrop" aria-hidden="true" />
      <div className="proc-fill" ref={fillRef} aria-hidden="true" />
      <div className="proc-inner">
        <div className="proc-head">
          <p className="kicker">Cómo trabajamos</p>
          <h2>El proceso, paso a paso</h2>
          <p>Desde el primer mensaje hasta la entrega, cada etapa queda clara y trazable.</p>
        </div>
        <div className="proc-track" aria-hidden="true">
          <span className="proc-track-base" />
          <span className="proc-track-fill" ref={railRef} />
          <span className="proc-runner" ref={runnerRef} />
          {steps.map(({ n }, i) => (
            <span
              className="proc-point"
              key={n}
              style={{ left: `${steps.length === 1 ? 50 : (i / (steps.length - 1)) * 100}%` }}
            >
              {n}
            </span>
          ))}
        </div>
        <ol className="proc-row">
          {steps.map(({ icon: Icon, n, title, desc }) => (
            <li className="proc-step" key={n}>
              <span className="proc-ghost" aria-hidden="true">
                {n}
              </span>
              <span className="proc-node" aria-hidden="true">
                <Icon size={26} strokeWidth={1.8} />
              </span>
              <span className="proc-n">PASO {n}</span>
              <strong>{title}</strong>
              <p>{desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
