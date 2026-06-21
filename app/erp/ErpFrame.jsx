"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  ChevronDown,
  ClipboardList,
  CreditCard,
  DollarSign,
  FileBarChart,
  Globe,
  LayoutDashboard,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  ReceiptText,
  Settings2,
  SlidersHorizontal,
  UserCog,
  Wrench,
} from "lucide-react";
import LogoutButton from "./LogoutButton";
import ThemeToggle from "./ThemeToggle";

const publicWebUrl = process.env.NEXT_PUBLIC_WEB_URL || "/";

const orderItems = [
  { href: "/erp/ordenes", label: "Ordenes de trabajo", icon: ClipboardList, active: "ordenes" },
];

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

const systemItems = [{ href: "/erp/usuarios", label: "Usuarios", icon: UserCog, active: "usuarios" }];

const maintainerItems = [{ href: "/erp/mantenedores", label: "Mantenedores", icon: Wrench, active: "mantenedores" }];

const groups = [
  { key: "ordenes", label: "Orden De Trabajo", icon: ClipboardList, items: orderItems },
  { key: "ventas", label: "Ventas", icon: CreditCard, items: salesItems },
  { key: "inventario", label: "Inventario", icon: Boxes, items: inventoryItems },
  { key: "finanzas", label: "Finanzas", icon: DollarSign, items: financeItems },
  { key: "sistema", label: "Sistema", icon: UserCog, items: systemItems },
  { key: "mantenedores", label: "Mantenedores", icon: Settings2, items: maintainerItems },
];

function activeGroupKey(active) {
  return groups.find((group) => group.items.some((item) => item.active === active))?.key || "";
}

function NavItem({ item, active, collapsed }) {
  const Icon = item.icon;
  return (
    <Link className={`nav-main-link ${active === item.active ? "active" : ""}`} href={item.href} title={collapsed ? item.label : undefined}>
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function NavGroup({ group, active, collapsed, openKey, setOpenKey }) {
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
          <NavItem key={item.href} item={item} active={active} collapsed={collapsed} />
        ))}
      </div>
    </div>
  );
}

export default function ErpFrame({ active, title, session, children }) {
  const initialOpenKey = useMemo(() => activeGroupKey(active), [active]);
  const [openKey, setOpenKey] = useState(initialOpenKey);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("mactech-erp-sidebar");
    if (saved === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    if (!collapsed) setOpenKey(initialOpenKey);
  }, [active, collapsed, initialOpenKey]);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("mactech-erp-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <div className={`erp-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
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
            <NavItem item={{ href: "/erp", label: "Inicio", icon: LayoutDashboard, active: "dashboard" }} active={active} collapsed={collapsed} />
          </div>
          {groups.map((group) => (
            <NavGroup
              key={group.key}
              group={group}
              active={active}
              collapsed={collapsed}
              openKey={openKey}
              setOpenKey={setOpenKey}
            />
          ))}
        </nav>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="topbar-title-group">
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <a className="ghost-button compact-button topbar-web-link" href={publicWebUrl} target="_blank" rel="noreferrer">
              <Globe size={16} aria-hidden="true" />
              <span>Ir a web</span>
            </a>
            <ThemeToggle />
            <LogoutButton />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
