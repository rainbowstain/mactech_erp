"use client";

/*
 * ContactFinale — el cierre "Estamos en Arica" como pantalla COMPLETA que sube
 * y cubre el centro de control (el mismo efecto de las secciones previas).
 * Es una consola de localización en vivo: el mapa con retícula/radar a la
 * izquierda, los datos + accesos debajo, y las preguntas frecuentes ocupando
 * toda la columna derecha en desktop. Todo se revela con el scroll.
 *
 * En desktop se PINEA (cover + reveal scrubeado). En móvil NO se pinea —fluye
 * normal con un reveal al entrar— para que el contenido no se recorte y el
 * acordeón siga siendo interactivo. Sin JS / reduced-motion: todo visible.
 */

import { useRef, useEffect, useLayoutEffect } from "react";
import { MapPin, Clock, Navigation } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import FaqAccordion from "./FaqAccordion";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function ContactFinale({ whatsapp, maps, mapsEmbed, socials, faqs }) {
  const rootRef = useRef(null);
  const fillRef = useRef(null);

  useIsoLayoutEffect(() => {
    const root = rootRef.current;
    const fill = fillRef.current;
    const rises = [...root.querySelectorAll(".con-rise")];
    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    // Reparte el revelado de cada bloque en cascada de arriba hacia abajo.
    const paint = (reveal) => {
      root.style.setProperty("--con-reveal", reveal.toFixed(4));
      rises.forEach((el, i) => {
        const threshold = (i / Math.max(1, rises.length)) * 0.82;
        el.classList.toggle("is-on", reveal >= threshold);
      });
    };

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      // Desktop: pinear y revelar con el scroll (cover, como las otras secciones).
      mm.add("(min-width: 861px) and (prefers-reduced-motion: no-preference)", () => {
        const update = (p) => {
          const reveal = clamp01((p - 0.28) / 0.6);
          root.style.setProperty("--con-progress", p.toFixed(4));
          if (fill) fill.style.height = `${(p * 100).toFixed(2)}%`;
          paint(reveal);
        };
        update(0);
        const st = ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "+=150%",
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => update(self.progress),
        });
        return () => st.kill();
      });

      // Móvil: sin pin (flujo normal), reveal al entrar; el mapa relleno completo.
      mm.add("(max-width: 860px) and (prefers-reduced-motion: no-preference)", () => {
        root.style.setProperty("--con-progress", "1");
        if (fill) fill.style.height = "100%";
        const st = ScrollTrigger.create({
          trigger: root,
          start: "top 78%",
          end: "top 24%",
          scrub: 1,
          onUpdate: (self) => paint(self.progress),
        });
        return () => st.kill();
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        root.style.setProperty("--con-progress", "1");
        if (fill) fill.style.height = "100%";
        paint(1);
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="contacto" id="contacto" ref={rootRef} aria-label="Visítanos en Arica">
      <div className="contact-fill" ref={fillRef} aria-hidden="true" />
      <div className="contact-grid-bg" aria-hidden="true" />

      <div className="contact-stage">
        <div className="contact-bar con-rise">
          <div className="contact-bar-head">
            <p className="kicker">Visítanos</p>
            <h2>Estamos en Arica</h2>
          </div>
        </div>

        <div className="contact-layout">
          {/* Izquierda — mapa en vivo + datos */}
          <div className="contact-col contact-col--left">
            <div className="contact-map con-rise">
              <span className="contact-map-tag">MAPA · EN VIVO</span>
              <span className="contact-reticle" aria-hidden="true" />
              <iframe
                title="Ubicación MacTech en Arica"
                src={mapsEmbed}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>

            <div className="contact-meta con-rise">
              <dl className="contact-info">
                <div>
                  <dt>
                    <MapPin size={14} strokeWidth={2} aria-hidden="true" />
                    Dirección
                  </dt>
                  <dd>Bolognesi 340, Local 18, Arica, Chile.</dd>
                </div>
                <div>
                  <dt>
                    <Clock size={14} strokeWidth={2} aria-hidden="true" />
                    Horario
                  </dt>
                  <dd>Lun–Vie 9:30–19:00 · Sáb 11:00–18:00</dd>
                </div>
              </dl>

              <div className="contact-actions">
                <div className="contact-socials">
                  {socials.map(({ href, label, icon: Icon, disabled }) =>
                    disabled ? (
                      <span key={label} className="social disabled" aria-label={`${label} (pronto)`} title={`${label} pronto`}>
                        <Icon aria-hidden="true" />
                      </span>
                    ) : (
                      <a key={label} className="social" href={href} target="_blank" rel="noreferrer" aria-label={label}>
                        <Icon aria-hidden="true" />
                      </a>
                    )
                  )}
                </div>
                <div className="contact-cta">
                  <a className="btn-primary" href={whatsapp} target="_blank" rel="noreferrer">
                    <FaWhatsapp aria-hidden="true" />
                    WhatsApp
                  </a>
                  <a className="btn-ghost" href={maps} target="_blank" rel="noreferrer">
                    <Navigation size={18} aria-hidden="true" />
                    Cómo llegar
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Derecha — consola de preguntas frecuentes (todo el alto en desktop) */}
          <div className="contact-col contact-col--right con-rise">
            <div className="contact-faq">
              <div className="contact-faq-head">
                <h3 className="faq-title">Preguntas frecuentes</h3>
                <span className="contact-faq-tag">FAQ · 0{faqs.length}</span>
              </div>
              <FaqAccordion items={faqs} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
