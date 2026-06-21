"use client";

import Link from "next/link";
import { formatDate, formatMoney, textOrDash } from "@/lib/format";
import DataTable from "./DataTable";

function orderReviewHref(orderId) {
  return `/erp/ordenes?tab=revision&id=${orderId}`;
}

export default function OrdersTable({ orders, actionLabel = "Ver" }) {
  if (!orders.length) {
    return <div className="empty-state">No hay ordenes para mostrar.</div>;
  }

  return (
    <DataTable
      rows={orders}
      emptyMessage="No hay ordenes para mostrar."
      columns={[
        {
          key: "id",
          label: "OT",
          value: (order) => `#${order.id}`,
          render: (order) => (
            <Link className="table-link" href={orderReviewHref(order.id)}>
              #{order.id}
            </Link>
          ),
        },
        {
          key: "cliente",
          label: "Cliente",
          value: (order) => `${order.cliente_nombre || ""} ${order.cliente_run || ""}`,
          render: (order) => (
            <>
              <strong>{textOrDash(order.cliente_nombre)}</strong>
              <span className="subtext">{textOrDash(order.cliente_run)}</span>
            </>
          ),
        },
        {
          key: "marca",
          label: "Marca",
          value: (order) => `${order.equipo_nombre || ""} ${order.dispositivo_nombre || ""}`,
          render: (order) => (
            <>
              {textOrDash(order.equipo_nombre)}
              <span className="subtext">{textOrDash(order.dispositivo_nombre)}</span>
            </>
          ),
        },
        {
          key: "estado",
          label: "Estado",
          value: (order) => order.estado_nombre || order.estado,
          render: (order) => <span className="pill">{textOrDash(order.estado_nombre || order.estado)}</span>,
        },
        { key: "fecha", label: "Fecha", value: (order) => formatDate(order.created_at || order.fecha_entrega) },
        { key: "total", label: "Total", value: (order) => formatMoney(order.total), render: (order) => formatMoney(order.total) },
        {
          key: "action",
          label: "Accion",
          align: "center",
          filter: false,
          render: (order) => (
            <Link className="ghost-button compact-button" href={orderReviewHref(order.id)}>
              {actionLabel}
            </Link>
          ),
        },
      ]}
    />
  );
}
