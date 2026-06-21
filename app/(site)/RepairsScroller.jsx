"use client";

/*
 * RepairsScroller — reparaciones unificadas en un carril HORIZONTAL.
 * Al hacer scroll vertical la sección se pinea y el carril se desplaza a la
 * derecha (translateX), revelando las reparaciones de izquierda a derecha
 * antes de continuar hacia abajo. Aprovecha el espacio horizontal en desktop
 * y mobile. Sin JS (o reduced-motion) cae a un scroll horizontal nativo.
 */

import { useRef, useEffect, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function RepairsScroller({ heading, sub, groups }) {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const fillRef = useRef(null);

  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    const fill = fillRef.current;

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        section.classList.add("rscroll--pinned");
        section.style.setProperty("--repair-progress", "0");

        const distance = () => Math.max(0, track.scrollWidth - section.clientWidth);

        const tween = gsap.to(track, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: () => "+=" + distance(),
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              section.style.setProperty("--repair-progress", self.progress.toFixed(4));
              if (fill) fill.style.width = `${(self.progress * 100).toFixed(2)}%`;
            },
            onLeave: () => {
              section.classList.add("rscroll--released");
            },
            onEnterBack: () => {
              section.classList.remove("rscroll--released");
            },
          },
        });

        // Entrada del carril cuando la sección llega.
        gsap.from(track.querySelectorAll(".rcard, .rscroll-cat"), {
          opacity: 0,
          y: 24,
          duration: 0.5,
          ease: "power2.out",
          stagger: 0.04,
          scrollTrigger: { trigger: section, start: "top 70%" },
        });

        return () => {
          tween.kill();
          section.classList.remove("rscroll--pinned");
          section.classList.remove("rscroll--released");
          section.style.removeProperty("--repair-progress");
          gsap.set(track, { clearProps: "transform" });
        };
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="rscroll" id="reparaciones" ref={sectionRef} aria-label="Reparaciones">
      <div className="rscroll-track" ref={trackRef}>
        <div className="rscroll-intro">
          <p className="kicker">Reparaciones</p>
          <h2>{heading}</h2>
          <p className="section-sub">{sub}</p>
          <span className="rscroll-hint" aria-hidden="true">
            Desliza · explora →
          </span>
        </div>

        {groups.map((group) => (
          <RepairGroup key={group.label} group={group} />
        ))}
      </div>

      <div className="rscroll-progress" aria-hidden="true">
        <span className="rscroll-progress-fill" ref={fillRef} />
      </div>
    </section>
  );
}

function RepairGroup({ group }) {
  return (
    <>
      <div className="rscroll-cat">
        <span className="rscroll-cat-line" aria-hidden="true" />
        <span className="rscroll-cat-label">{group.label}</span>
      </div>
      {group.items.map(({ icon: Icon, title, desc }, i) => (
        <article className="rcard" key={title + i}>
          <span className="rcard-icon" aria-hidden="true">
            <Icon size={22} strokeWidth={1.7} />
          </span>
          <strong className="rcard-title">{title}</strong>
          <span className="rcard-desc">{desc}</span>
        </article>
      ))}
    </>
  );
}
