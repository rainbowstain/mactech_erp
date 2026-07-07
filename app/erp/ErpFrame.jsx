"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileBarChart,
  Globe,
  Menu,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";
import { APP_VERSION_LABEL } from "@/lib/version";

const publicWebUrl = process.env.NEXT_PUBLIC_WEB_URL || "/";

const inventoryItems = [
  { href: "/erp/inventario/productos", label: "Productos", icon: Boxes, active: "inventario-productos" },
  { href: "/erp/inventario/taller", label: "Taller", icon: PackageSearch, active: "inventario-taller" },
];

const salesItems = [{ href: "/erp/ventas/productos", label: "Venta Productos", icon: CreditCard, active: "ventas-productos" }];

const financeItems = [
  { href: "/erp/finanzas", label: "Dashboard", icon: DollarSign, active: "finanzas-dashboard" },
  { href: "/erp/finanzas/gastos", label: "Gastos", icon: ReceiptText, active: "finanzas-gastos" },
  { href: "/erp/finanzas/tramos", label: "Tramos", icon: SlidersHorizontal, active: "finanzas-tramos" },
  { href: "/erp/finanzas/reporte", label: "Reporte Mensual", icon: FileBarChart, active: "finanzas-reporte" },
];

// Sistema y Mantenedores se fusionaron en Configuración: ya no van en el
// sidebar, se acceden con el boton de tuerca de la barra superior.
const groups = [
  { key: "ventas", label: "Ventas", icon: CreditCard, items: salesItems },
  { key: "inventario", label: "Inventario", icon: Boxes, items: inventoryItems },
  { key: "finanzas", label: "Finanzas", icon: DollarSign, items: financeItems },
];

function activeGroupKey(active) {
  return groups.find((group) => group.items.some((item) => item.active === active))?.key || "";
}

function NavItem({ item, active, collapsed, onClose, className = "" }) {
  const Icon = item.icon;
  return (
    <Link className={`nav-main-link ${className} ${active === item.active ? "active" : ""}`} href={item.href} title={collapsed ? item.label : undefined} onClick={onClose}>
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function NavGroup({ group, active, collapsed, openKey, setOpenKey, onClose }) {
  const Icon = group.icon;
  const isOpen = !collapsed && openKey === group.key;
  const isActive = group.items.some((item) => item.active === active);

  function toggleGroup() {
    if (collapsed) {
      setOpenKey(group.key);
      return;
    }
    setOpenKey(isOpen ? "" : group.key);
  }

  return (
    <div className={`nav-main-item nav-main-item-sub ${isOpen ? "open" : ""} ${isActive ? "active-group" : ""}`}>
      <button className="nav-main-link nav-main-link-submenu" type="button" onClick={toggleGroup} title={collapsed ? group.label : undefined}>
        <Icon size={18} aria-hidden="true" />
        <span>{group.label}</span>
        <ChevronDown className="nav-main-caret" size={15} aria-hidden="true" />
      </button>
      <div className="nav-main-submenu">
        {group.items.map((item) => (
          <NavItem key={item.href} item={item} active={active} collapsed={collapsed} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}

export default function ErpFrame({ active, title, session, children }) {
  const pathname = usePathname();
  const initialOpenKey = useMemo(() => activeGroupKey(active), [active]);
  const [openKey, setOpenKey] = useState(initialOpenKey);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("mactech-erp-sidebar");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!collapsed) setOpenKey(initialOpenKey);
  }, [active, collapsed, initialOpenKey]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("mactech-erp-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  function closeMobileSidebar() {
    setSidebarOpen(false);
  }

  return (
    <div className={`erp-shell ${collapsed ? "sidebar-collapsed" : ""} ${sidebarOpen ? "sidebar-mobile-open" : ""}`}>
      {sidebarOpen ? <div className="sidebar-overlay" onClick={closeMobileSidebar} /> : null}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/brand/mactech-logo-white-trim.png" alt="MacTech" />
          <small>ERP Taller</small>
          <button className="sidebar-collapse-button" type="button" onClick={toggleSidebar} title={collapsed ? "Abrir menu" : "Minimizar menu"}>
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>
        </div>
        <div className="sidebar-user">
          <span>{session.name || session.email}</span>
          <small>{session.email} · {session.role}</small>
        </div>
        <nav className="nav-list" aria-label="Principal">
          <div className="nav-main-item">
            <NavItem
              item={{ href: "/erp/ordenes", label: "Ordenes de trabajo", icon: ClipboardList, active: "ordenes" }}
              active={active}
              collapsed={collapsed}
              onClose={closeMobileSidebar}
              className="nav-main-link-primary"
            />
          </div>
          {groups.map((group) => (
            <NavGroup
              key={group.key}
              group={group}
              active={active}
              collapsed={collapsed}
              openKey={openKey}
              setOpenKey={setOpenKey}
              onClose={closeMobileSidebar}
            />
          ))}
        </nav>
        <a className="sidebar-web-link" href={publicWebUrl} target="_blank" rel="noreferrer" title="Ir a web">
          <Globe size={16} aria-hidden="true" />
          <span>Ir a web</span>
        </a>
        <div className="sidebar-version" title="Versión del sistema">{APP_VERSION_LABEL}</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title-group">
            <button className="sidebar-mobile-toggle" type="button" onClick={() => setSidebarOpen((v) => !v)} aria-label="Abrir menú">
              <Menu size={22} aria-hidden="true" />
            </button>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <div className="topbar-user-chip">
              <span>{session.name || session.email}</span>
              <small>{session.role}</small>
            </div>
            <Link className="icon-button" href="/erp/mantenedores" title="Configuración">
              <Settings size={18} aria-hidden="true" />
            </Link>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
