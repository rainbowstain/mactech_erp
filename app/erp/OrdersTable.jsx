"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { formatDate, formatMoney, textOrDash } from "@/lib/format";
import { confirmAction, notifySuccess, notifyWarning } from "@/lib/notify";
import DataTable from "./DataTable";

function orderReviewHref(orderId) {
  return `/erp/ordenes?tab=revision&id=${orderId}`;
}

function uniqueOptions(orders, getValue) {
  const seen = new Map();
  orders.forEach((order) => {
    const value = getValue(order);
    if (value) seen.set(value, value);
  });
  return Array.from(seen.values())
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((value) => ({ value, label: value }));
}

export default function OrdersTable({ orders, actionLabel = "Ver", canDelete = false }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);

  const estadoOptions = useMemo(
    () => uniqueOptions(orders, (order) => order.estado_nombre || order.estado),
    [orders]
  );
  const modeloOptions = useMemo(() => uniqueOptions(orders, (order) => order.dispositivo_nombre), [orders]);

  async function handleDelete(order) {
    const ok = await confirmAction({
      title: `Eliminar OT #${order.id}`,
      message: `Se eliminará la OT de ${order.cliente_nombre || "cliente"}. Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      danger: true,
    });
    if (!ok) return;
    setDeletingId(order.id);
    try {
      const response = await fetch(`/api/erp/ordenes/${order.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        notifyWarning(data.message || "No se pudo eliminar la orden.");
        return;
      }
      notifySuccess(`OT #${order.id} eliminada.`);
      router.refresh();
    } catch {
      notifyWarning("No se pudo conectar para eliminar la orden.");
    } finally {
      setDeletingId(null);
    }
  }

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
          filterLabel: "Modelo",
          value: (order) => `${order.equipo_nombre || ""} ${order.dispositivo_nombre || ""}`,
          filterOptions: modeloOptions,
          filterSearchable: true,
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
          filterOptions: estadoOptions,
          render: (order) => <span className="pill">{textOrDash(order.estado_nombre || order.estado)}</span>,
        },
        {
          key: "fecha",
          label: "Fecha",
          value: (order) => formatDate(order.created_at || order.fecha_entrega),
          filterType: "date",
          dateValue: (order) => order.created_at || order.fecha_entrega,
          sortable: true,
          sortValue: (order) => new Date(order.created_at || order.fecha_entrega || 0).getTime(),
          sortLabels: { asc: "Fecha (más antigua)", desc: "Fecha (más reciente)" },
        },
        {
          key: "total",
          label: "Total",
          filter: false,
          value: (order) => formatMoney(order.total),
          render: (order) => formatMoney(order.total),
          sortable: true,
          sortValue: (order) => Number(order.total) || 0,
          sortLabels: { asc: "Menor a mayor valor", desc: "Mayor a menor valor" },
        },
        {
          key: "action",
          label: "Accion",
          align: "center",
          filter: false,
          render: (order) => (
            <div className="orders-actions">
              <Link className="ghost-button compact-button" href={orderReviewHref(order.id)}>
                {actionLabel}
              </Link>
              {canDelete ? (
                <button
                  type="button"
                  className="ghost-button compact-button order-delete-button"
                  onClick={() => handleDelete(order)}
                  disabled={deletingId === order.id}
                  title="Eliminar OT"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  );
}
