"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  LogIn,
  Smartphone,
  BatteryCharging,
  Cpu,
  FlaskConical,
  Wrench,
  Unlock,
  ShieldCheck,
  Package,
  Monitor,
  HardDrive,
  Power,
  MessageCircle,
  ClipboardCheck,
  PackageCheck,
} from "lucide-react";
import {
  FaWhatsapp,
  FaInstagram,
  FaTiktok,
  FaFacebookF,
  FaYoutube,
} from "react-icons/fa6";
import {
  SiApple,
  SiSamsung,
  SiXiaomi,
  SiHuawei,
  SiMotorola,
  SiLg,
  SiSony,
  SiLenovo,
  SiHp,
  SiDell,
  SiAsus,
  SiAcer,
  SiMsi,
} from "react-icons/si";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import DiagnosticHero from "./DiagnosticHero";
import RepairsScroller from "./RepairsScroller";
import ProcessRoute from "./ProcessRoute";
import CommandCenter from "./CommandCenter";
import ContactFinale from "./ContactFinale";
import { APP_VERSION } from "@/lib/version";

gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const WHATSAPP = "https://wa.me/message/F55DFSIY3UPNE1";
const MAPS = "https://www.google.com/maps/search/?api=1&query=Bolognesi%20340%20Local%2018%20Arica";
const MAPS_EMBED = "https://www.google.com/maps?q=Bolognesi+340+Local+18+Arica+Chile&output=embed";
const ERP_URL = "/erp/login";

const NAV = [
  { href: "#reparaciones", label: "Reparaciones" },
  { href: "#proceso", label: "Proceso" },
  { href: "#contacto", label: "Contacto" },
];

const BRANDS = [
  { icon: SiApple, label: "Apple" },
  { icon: SiSamsung, label: "Samsung" },
  { icon: SiXiaomi, label: "Xiaomi" },
  { icon: SiHuawei, label: "Huawei" },
  { icon: SiMotorola, label: "Motorola" },
  { icon: SiLg, label: "LG" },
  { icon: SiSony, label: "Sony" },
  { icon: SiLenovo, label: "Lenovo" },
  { icon: SiHp, label: "HP" },
  { icon: SiDell, label: "Dell" },
  { icon: SiAsus, label: "Asus" },
  { icon: SiAcer, label: "Acer" },
  { icon: SiMsi, label: "MSI" },
];

const PHONE_REPAIRS = [
  { icon: Smartphone, title: "Cambio de Pantallas", desc: "Rotas o dañadas." },
  { icon: BatteryCharging, title: "Batería y pin de carga", desc: "Deficiente o dañada." },
  { icon: Cpu, title: "Sistema Operativo", desc: "Lentitud y rendimiento." },
  { icon: FlaskConical, title: "Baño Químico de Placa", desc: "Daños por líquidos." },
  { icon: Wrench, title: "Reparación de placas", desc: "Micro-soldadura de componentes." },
  { icon: Unlock, title: "Liberación de bandas", desc: "Para equipos del exterior." },
  { icon: ShieldCheck, title: "Mantenimiento Preventivo", desc: "Para equipos celulares." },
  { icon: Package, title: "Accesorios y Repuestos", desc: "Para equipos celulares." },
];

const PC_REPAIRS = [
  { icon: Monitor, title: "Cambio de Pantallas", desc: "Rotas o dañadas." },
  { icon: BatteryCharging, title: "Reemplazo de Batería", desc: "Deficiente o dañada." },
  { icon: HardDrive, title: "Disco Duro y Memoria", desc: "Reemplazo y aumento." },
  { icon: Wrench, title: "Reparación de Placas", desc: "Micro-soldadura y componentes." },
  { icon: FlaskConical, title: "Baño Químico de Placa", desc: "Para equipos mojados." },
  { icon: ShieldCheck, title: "Mantenimiento Preventivo", desc: "Para Notebooks y PCs." },
  { icon: Cpu, title: "Sistema Operativo", desc: "Instalación y configuración." },
  { icon: Power, title: "Fuentes de poder y partes", desc: "Maximiza el rendimiento." },
];

const STEPS = [
  { icon: MessageCircle, n: "01", title: "Escríbenos", desc: "Cuéntanos la falla por WhatsApp y agenda tu visita." },
  { icon: ClipboardCheck, n: "02", title: "Diagnóstico", desc: "Revisamos tu equipo y te damos una cotización clara." },
  { icon: Wrench, n: "03", title: "Reparación", desc: "Repuestos de calidad y microsoldadura de precisión." },
  { icon: PackageCheck, n: "04", title: "Entrega", desc: "Tu equipo como nuevo, con 90 días de garantía." },
];

const TRUST = ["Herramientas profesionales", "Especialistas en Apple", "Repuestos confiables", "Cercano"];

const FAQS = [
  { q: "¿Puedo pagar con transferencia?", a: "Sí. Aceptamos transferencia bancaria, débito y efectivo." },
  { q: "¿Tienen garantía?", a: "Sí. La garantía estándar es de 90 días; reparaciones en placa tienen 30 días." },
  { q: "¿Reparan en el día?", a: "Muchas reparaciones se entregan el mismo día; depende del repuesto y la falla." },
  { q: "¿Cuánto demora una reparación?", a: "Según el diagnóstico: desde unos minutos hasta 24–72 horas en casos complejos." },
  { q: "¿Compran equipos?", a: "Sí, evaluamos y compramos equipos. Escríbenos por WhatsApp y te cotizamos." },
];

// Marcas reconocibles por su isotipo: no necesitan nombre al lado.
const BRANDS_NO_NAME = new Set(["Apple", "Samsung", "LG", "Sony", "Lenovo", "HP", "Dell", "Asus", "Acer"]);
const BRANDS_WIDE_MARK = new Set(["Samsung", "Sony", "Lenovo", "Asus", "Acer", "MSI", "LG"]);
const brandClassName = (label) =>
  `brand${BRANDS_WIDE_MARK.has(label) ? " brand--wide" : ""} brand--${label.toLowerCase()}`;

const SOCIALS = [
  { href: "https://www.instagram.com/mactech.cl/", label: "Instagram", icon: FaInstagram },
  { href: "https://www.tiktok.com/@mactech.cl", label: "TikTok", icon: FaTiktok },
  { href: "https://www.facebook.com/profile.php?id=61590618352242", label: "Facebook", icon: FaFacebookF },
  { href: "", label: "YouTube", icon: FaYoutube, disabled: true },
];

export default function Landing() {
  const root = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Navegación: las secciones pinneadas se "activan" al llegar a su trigger, así
  // que un ancla nativa caería sobre la sección aún sin revelar. Saltamos dentro
  // del rango ya revelado del pin (o al tope del bloque si no está pinneada).
  const handleNavClick = (e, href) => {
    const id = href.replace("#", "");
    const target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    const pinned = ScrollTrigger.getAll().find((t) => t.trigger === target && t.pin);
    let y;
    if (pinned) {
      const at = id === "reparaciones" ? 0.06 : 0.9; // revelado de la sección
      y = pinned.start + (pinned.end - pinned.start) * at;
    } else {
      y = window.scrollY + target.getBoundingClientRect().top - 76; // bajo la nav
    }
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  };

  useIsoLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // La navbar entra despues del golpe del H1 del hero.
        gsap.from(".nav-inner", { y: -22, opacity: 0, duration: 0.7, ease: "power3.out", delay: 1.5 });

        // Reveal genérico de bloques marcados con .reveal.
        gsap.utils.toArray(".reveal").forEach((el) => {
          gsap.from(el, {
            y: 34,
            opacity: 0,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 88%" },
          });
        });

        const brands = document.querySelector(".brands");
        const clamp01 = (value) => Math.max(0, Math.min(1, value));
        const brandTriggers = brands
          ? [
              ScrollTrigger.create({
                trigger: ".rscroll",
                start: "top bottom",
                end: "top top",
                onEnter: () => {
                  brands.classList.add("brands--active");
                  brands.classList.remove("brands--gone");
                  brands.style.setProperty("--brand-exit", "0");
                },
                onUpdate: (self) => {
                  brands.style.setProperty("--brand-progress", (self.progress * 0.28).toFixed(4));
                },
                onLeaveBack: () => {
                  brands.classList.remove("brands--active", "brands--gone");
                  brands.style.setProperty("--brand-progress", "0");
                  brands.style.setProperty("--brand-exit", "0");
                },
              }),
              ScrollTrigger.create({
                trigger: ".proc",
                start: "top top",
                end: "+=195%",
                scrub: true,
                onEnter: () => {
                  brands.classList.add("brands--active");
                  brands.classList.remove("brands--gone");
                },
                onUpdate: (self) => {
                  brands.classList.add("brands--active");
                  brands.style.setProperty("--brand-progress", (0.28 + self.progress * 0.72).toFixed(4));
                  brands.style.setProperty("--brand-exit", clamp01((self.progress - 0.82) / 0.18).toFixed(4));
                },
                onLeave: () => {
                  brands.style.setProperty("--brand-progress", "1");
                  brands.style.setProperty("--brand-exit", "1");
                  brands.classList.add("brands--gone");
                },
                onEnterBack: () => {
                  brands.classList.add("brands--active");
                  brands.classList.remove("brands--gone");
                },
              }),
            ]
          : [];

        return () => brandTriggers.forEach((trigger) => trigger.kill());
      });
    }, root);

    return () => ctx.revert();
  }, []);

  return (
    <main className="site" ref={root}>
      {/* ===== Nav ===== */}
      <header className={`nav${scrolled ? " nav--scrolled" : ""}`}>
        <div className="nav-inner">
          <a className="nav-brand" href="#top" aria-label="MacTech inicio">
            <img src="/logoduo.png" alt="MacTech" />
          </a>
          <nav className="nav-links" aria-label="Navegación principal">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => handleNavClick(e, l.href)}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <a className="nav-cta" href={WHATSAPP} target="_blank" rel="noreferrer">
              <span className="nav-cta-ico" aria-hidden="true">
                <FaWhatsapp />
              </span>
              Contáctanos
            </a>
          </div>
        </div>
      </header>

      {/* ===== Hero — Diagnostic Flow (queda fijo detrás) ===== */}
      <DiagnosticHero whatsapp={WHATSAPP} maps={MAPS} />

      {/* ===== Flujo: sube y se superpone sobre el hero fijo ===== */}
      <div className="flow">
        {/* ===== Marcas — señales del sistema ===== */}
        <section className="brands" aria-label="Marcas que reparamos">
          <div className="marquee">
            <div className="marquee-track">
              {[...BRANDS, ...BRANDS, ...BRANDS].map(({ icon: Icon, label }, i) => (
                <span className={brandClassName(label)} key={`${label}-${i}`} title={label}>
                  <Icon aria-hidden="true" />
                  {!BRANDS_NO_NAME.has(label) && <span className="brand-name">{label}</span>}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===== Reparaciones — carril horizontal unificado ===== */}
        <RepairsScroller
          heading="Todo tu equipo, en un solo lugar"
          sub="Repuestos de calidad y garantía en cada reparación, de celulares a notebooks."
          groups={[
            { label: "Celulares y Tablets", items: PHONE_REPAIRS },
            { label: "Notebooks y PC", items: PC_REPAIRS },
          ]}
        />

        {/* ===== Proceso — ruta horizontal (revela 01 → 04) ===== */}
        <ProcessRoute steps={STEPS} />

        {/* ===== Por qué elegirnos — Command Center (pantalla completa) ===== */}
        <CommandCenter items={TRUST} />

        {/* ===== Contacto — consola "Estamos en Arica" (pantalla completa) ===== */}
        <ContactFinale
          whatsapp={WHATSAPP}
          maps={MAPS}
          mapsEmbed={MAPS_EMBED}
          socials={SOCIALS}
          faqs={FAQS}
        />

        {/* ===== Footer ===== */}
        <footer className="foot">
        <div className="foot-inner">
          <p className="foot-copy">© {new Date().getFullYear()} MacTech · Servicio Técnico · Arica</p>
          <a className="foot-erp" href={ERP_URL}>
            <LogIn size={12} aria-hidden="true" />
            Acceso interno
          </a>
          <span className="foot-version">v{APP_VERSION}</span>
        </div>
        </footer>
      </div>
    </main>
  );
}
