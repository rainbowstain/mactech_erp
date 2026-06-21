"use client";

/*
 * DiagnosticHero — la hero del concepto "MacTech Diagnostic Flow".
 * Fondo oscuro premium con una RED TÉCNICA en canvas (nodos + líneas finas en
 * varias profundidades) y una RUTA de diagnóstico en SVG que se dibuja al hacer scroll.
 * El H1 entra con split-text (palabra por palabra, stretch sutil + settle).
 * Secuencia inicial pinneada con ScrollTrigger (scrub): las capas se separan
 * en profundidad y la ruta se traza antes de liberar el scroll.
 * Todo el canvas es decorativo (aria-hidden). Respeta prefers-reduced-motion.
 */

import { useRef, useEffect, useLayoutEffect } from "react";
import { MapPin } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa6";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Nodos de la ruta de diagnóstico (coinciden con la 'd' del path, en %).
const ROUTE_DOTS = [
  [22, 80],
  [48, 62],
  [76, 42],
  [96, 24],
];

export default function DiagnosticHero({ whatsapp, maps }) {
  const heroRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const routeRef = useRef(null);
  const contentRef = useRef(null);
  const progressRef = useRef(0);

  useIsoLayoutEffect(() => {
    const heroEl = heroRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const routePath = routeRef.current;
    const content = contentRef.current;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const desktop = window.matchMedia("(min-width: 760px)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const TAU = Math.PI * 2;
    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
    const smooth = (a, b, x) => {
      const t = clamp01((x - a) / (b - a));
      return t * t * (3 - 2 * t);
    };
    const rand = (a, b) => a + Math.random() * (b - a);

    let W = 0;
    let H = 0;
    let cssW = 0;
    let small = false;
    let nodes = [];

    const build = () => {
      small = cssW < 760;
      const count = small ? 30 : 64;
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random(),
          y: Math.random(),
          depth: Math.random(), // 0 lejos · 1 cerca
          r: rand(0.6, 2.1),
          phase: rand(0, TAU),
          sp: rand(0.15, 0.55),
          amp: rand(0.004, 0.018),
          bright: Math.random() < 0.16,
        });
      }
    };

    const resize = () => {
      cssW = stage.clientWidth;
      const cssH = stage.clientHeight;
      W = Math.round(cssW * dpr);
      H = Math.round(cssH * dpr);
      canvas.width = W;
      canvas.height = H;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      build();
    };

    // Parallax de capas DOM controlado por el progreso del pin (0 → 1).
    let lastDomP = -1;
    const updateDom = (p) => {
      if (Math.abs(p - lastDomP) < 0.0008) return;
      lastDomP = p;
      if (routePath) routePath.style.strokeDashoffset = String(Math.max(0, 1 - p * 1.8));
      heroEl.style.setProperty("--hero-progress", p.toFixed(4));
      // El contenido del hero (H1/CTAs) se mantiene QUIETO: el fondo y la ruta
      // llevan la profundidad visual con el scroll.
    };

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    let t0 = performance.now();
    let raf = 0;
    let running = false;

    const drawGrid = (ox, oy) => {
      const step = 110 * dpr;
      ctx.strokeStyle = "rgba(124,77,255,0.05)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = ox % step; x < W; x += step) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
      }
      for (let y = oy % step; y < H; y += step) {
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
      }
      ctx.stroke();
    };

    const draw = (now) => {
      const time = reduce ? 3 : (now - t0) / 1000;
      const p = progressRef.current;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      ctx.clearRect(0, 0, W, H);

      drawGrid(pointer.x * 44 * dpr - p * 70 * dpr, -p * 220 * dpr);

      const pts = new Array(nodes.length);
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const dx = Math.cos(time * n.sp + n.phase) * n.amp;
        const dy = Math.sin(time * n.sp * 0.9 + n.phase) * n.amp;
        const sep = n.depth - 0.5;
        const par = -p * 0.14 + sep * p * 0.7; // separación en profundidad (más notoria)
        const swirl = Math.sin(time * 0.28 + n.phase + p * 2.2) * (0.012 + n.depth * 0.018);
        const px = (n.x + dx + swirl + pointer.x * (0.025 + n.depth * 0.1)) * W;
        const py = (n.y + dy + par + Math.cos(time * 0.22 + n.phase) * (0.006 + n.depth * 0.012) + pointer.y * (0.025 + n.depth * 0.1)) * H;
        pts[i] = { px, py, n };
      }

      ctx.lineWidth = Math.max(1, dpr * 0.65);
      const maxd = small ? 0.19 : 0.155;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const ddx = (a.px - b.px) / W;
          const ddy = (a.py - b.py) / H;
          const dist = Math.hypot(ddx, ddy);
          if (dist > maxd) continue;
          const al = (1 - dist / maxd) * 0.58 * (1 - p * 0.4);
          if (al <= 0.012) continue;
          ctx.strokeStyle = `rgba(150,116,255,${al})`;
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.stroke();
        }
      }

      for (let i = 0; i < pts.length; i++) {
        const { px, py, n } = pts[i];
        const r = n.r * dpr * (0.8 + n.depth * 0.95);
        const baseA = (0.3 + n.depth * 0.58) * (1 - p * 0.28);
        if (n.bright) {
          ctx.fillStyle = `rgba(124,77,255,${(baseA * 0.3).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(px, py, r * 3.8, 0, TAU);
          ctx.fill();
          ctx.fillStyle = `rgba(230,224,255,${Math.min(0.98, baseA + 0.36).toFixed(3)})`;
        } else {
          ctx.fillStyle = `rgba(170,154,255,${baseA.toFixed(3)})`;
        }
        ctx.beginPath();
        ctx.arc(px, py, r, 0, TAU);
        ctx.fill();
      }

      updateDom(p);
      if (running && !reduce) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    resize();
    if (reduce) draw(performance.now());

    const ro = new ResizeObserver(() => {
      resize();
      t0 = performance.now();
      if (reduce) draw(performance.now());
    });
    ro.observe(stage);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) start();
        else stop();
      },
      { threshold: 0.01 }
    );
    io.observe(stage);

    if (desktop && !reduce) window.addEventListener("pointermove", onMove, { passive: true });

    const ctxGsap = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Entrada del H1 por línea: primero "Tu dispositivo," y luego "como nuevo."
        const primaryTitleWords = heroEl.querySelectorAll(".title-line:not(.title-line--accent) .title-word-i");
        const accentTitleWords = heroEl.querySelectorAll(".title-line--accent .title-word-i");
        const scrollCue = heroEl.querySelector(".hero-scroll");
        const titleWords = [...primaryTitleWords, ...accentTitleWords];
        gsap.set(titleWords, { yPercent: 120, opacity: 0, scaleY: 1.16, transformOrigin: "bottom center" });
        gsap.set(scrollCue, { opacity: 0, y: 12, scale: 0.94, "--scroll-flare": 1 });
        const tl = gsap.timeline({ delay: 0.15 });
        tl.to(primaryTitleWords, { yPercent: 0, opacity: 1, scaleY: 1, duration: 0.95, ease: "power4.out", stagger: 0.08 })
          .to(accentTitleWords, { yPercent: 0, opacity: 1, scaleY: 1, duration: 0.86, ease: "power4.out", stagger: 0.07 }, "-=0.42")
          .to(scrollCue, { opacity: 1, y: 0, scale: 1.08, duration: 0.26, ease: "back.out(2.2)" }, 1.36)
          .to(scrollCue, { scale: 1, "--scroll-flare": 0, duration: 0.72, ease: "power2.out" }, 1.58)
          .from(heroEl.querySelector(".hero-lead"), { y: 22, opacity: 0, duration: 0.62, ease: "power3.out" }, 1.36)
          .from(heroEl.querySelector(".hero-cta"), { y: 22, opacity: 0, duration: 0.62, ease: "power3.out" }, 1.42);

        gsap.from(heroEl.querySelector(".hero-eyebrow"), {
          y: 18,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          delay: 0.1,
        });
        // El hero queda QUIETO (pin sin spacer) mientras el contenido de abajo
        // sube y se superpone sobre él. El progreso (0→1) maneja el parallax de
        // capas + el trazo de la ruta a medida que el contenido lo va tapando.
        const st = ScrollTrigger.create({
          trigger: heroEl,
          start: "top top",
          end: "bottom top",
          pin: true,
          pinSpacing: false,
          anticipatePin: 1,
          onUpdate: (self) => {
            progressRef.current = self.progress;
          },
        });

        return () => {
          st.kill();
          progressRef.current = 0;
          updateDom(0);
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        // Sin movimiento: ruta ya trazada, capas en su sitio.
        if (routePath) routePath.style.strokeDashoffset = "0";
      });
    }, heroEl);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      ctxGsap.revert();
    };
  }, []);

  return (
    <section className="hero" id="top" ref={heroRef}>
      <div className="hero-stage" ref={stageRef}>
        <canvas ref={canvasRef} className="hero-net" aria-hidden="true" />

        <svg className="hero-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path
            className="hero-route-bg"
            d="M 4 80 L 22 80 L 30 62 L 48 62 L 56 42 L 76 42 L 84 24 L 96 24"
            vectorEffect="non-scaling-stroke"
          />
          <path
            ref={routeRef}
            className="hero-route-path"
            d="M 4 80 L 22 80 L 30 62 L 48 62 L 56 42 L 76 42 L 84 24 L 96 24"
            pathLength="1"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="hero-route-dots" aria-hidden="true">
          {ROUTE_DOTS.map(([x, y]) => (
            <span key={`${x}-${y}`} className="hero-route-dot" style={{ left: `${x}%`, top: `${y}%` }} />
          ))}
        </div>

        <div className="hero-scrim" aria-hidden="true" />

        <div className="hero-content" ref={contentRef}>
          <p className="hero-eyebrow">Servicio técnico · Arica</p>
          <h1 className="hero-title">
            <span className="title-line">
              <span className="title-word">
                <span className="title-word-i">Tu</span>
              </span>{" "}
              <span className="title-word">
                <span className="title-word-i">dispositivo,</span>
              </span>
            </span>
            <span className="title-line title-line--accent">
              <span className="title-word">
                <span className="title-word-i">como</span>
              </span>{" "}
              <span className="title-word">
                <span className="title-word-i">nuevo.</span>
              </span>
            </span>
          </h1>
          <p className="hero-lead">
            Reparación de iPhone, Mac, PC, Android y consolas con repuestos de calidad y 90 días de garantía.
          </p>
          <div className="hero-cta">
            <a className="btn-primary" href={whatsapp} target="_blank" rel="noreferrer">
              <FaWhatsapp aria-hidden="true" />
              Hablar por WhatsApp
            </a>
            <a className="btn-ghost" href={maps} target="_blank" rel="noreferrer">
              <MapPin size={18} aria-hidden="true" />
              Cómo llegar
            </a>
          </div>
        </div>
      </div>

      <div className="hero-scroll" aria-hidden="true">
        <span>SCROLL</span>
        <span className="hero-scroll-rail">
          <span className="hero-scroll-bead" />
        </span>
      </div>
    </section>
  );
}
