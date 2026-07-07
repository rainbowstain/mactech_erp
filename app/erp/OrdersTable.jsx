"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { formatDate, formatMoney, orderStatusPillClass, textOrDash } from "@/lib/format";
import { confirmAction, notifySuccess, notifyWarning } from "@/lib/notify";
import { formatRut } from "@/lib/rut";
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

// Estados operativos que se cambian directo en la tabla. Garantia (4) y
// Entregado (5) pasan por sus flujos (boton garantia / cierre en revision).
const QUICK_STATES = [1, 2, 3, 6];

// Dias calendario que la OT lleva (o estuvo) en taller. Mientras esta abierta
// corre contra hoy; al cerrarse queda fija contra la fecha de salida.
// Ingreso y cierre el mismo dia = 0.
function daysInShop(order) {
  const start = new Date(order.created_at || order.fecha_entrega || NaN);
  if (Number.isNaN(start.getTime())) return null;
  const closed = Number(order.estado) === 5;
  const end = closed ? new Date(order.fecha_salida || order.fecha_entrega || start) : new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.max(0, Math.round((endDay - startDay) / 86400000));
}

function StatusCell({ order, orderStates, onChange, saving }) {
  const estado = Number(order.estado);
  const pillClass = orderStatusPillClass(estado);

  if (!QUICK_STATES.includes(estado) || !orderStates.length) {
    return (
      <span className={`pill ${pillClass}`} title="Este estado se gestiona desde la orden (Ver)">
        {textOrDash(order.estado_nombre || order.estado)}
      </span>
    );
  }

  return (
    <select
      className={`pill status-select ${pillClass}`}
      value={estado}
      disabled={saving}
      title="Cambiar estado"
      aria-label={`Cambiar estado de la OT ${order.id}`}
      onChange={(event) => onChange(order, Number(event.target.value))}
    >
      {orderStates
        .filter((state) => QUICK_STATES.includes(Number(state.id)))
        .map((state) => (
          <option key={state.id} value={state.id}>
            {state.nombre_estado}
          </option>
        ))}
    </select>
  );
}

export default function OrdersTable({ orders, orderStates = [], actionLabel = "Ver", canDelete = false }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);
  const [statusSavingId, setStatusSavingId] = useState(null);

  // Con el catalogo completo de estados se puede filtrar por estados que hoy
  // no tienen ordenes a la vista (p. ej. marcar solo Ingresado + Entregado).
  const estadoOptions = useMemo(
    () =>
      orderStates.length
        ? orderStates.map((state) => ({ value: state.nombre_estado, label: state.nombre_estado }))
        : uniqueOptions(orders, (order) => order.estado_nombre || order.estado),
    [orderStates, orders]
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

  async function handleStatusChange(order, estado) {
    setStatusSavingId(order.id);
    try {
      const response = await fetch(`/api/erp/ordenes/${order.id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        notifyWarning(data.message || "No se pudo cambiar el estado.");
        return;
      }
      notifySuccess(`OT #${order.id} actualizada.`);
      router.refresh();
    } catch {
      notifyWarning("No se pudo conectar para cambiar el estado.");
    } finally {
      setStatusSavingId(null);
    }
  }

  if (!orders.length) {
    return <div className="empty-state">No hay ordenes para mostrar.</div>;
  }

  return (
    <DataTable
      rows={orders}
      emptyMessage="No hay ordenes para mostrar."
      searchPlaceholder="Buscar OT, cliente, RUT o equipo"
      columns={[
        {
          key: "id",
          label: "OT",
          filter: false,
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
          filter: false,
          value: (order) => `${order.cliente_nombre || ""} ${order.cliente_run || ""}`,
          render: (order) => (
            <>
              <strong>{textOrDash(order.cliente_nombre)}</strong>
              <span className="subtext">{textOrDash(formatRut(order.cliente_run))}</span>
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
          filterMultiple: true,
          render: (order) => (
            <StatusCell
              order={order}
              orderStates={orderStates}
              onChange={handleStatusChange}
              saving={statusSavingId === order.id}
            />
          ),
        },
        {
          key: "fecha",
          label: "Ingreso",
          value: (order) => formatDate(order.created_at || order.fecha_entrega),
          filterType: "day",
          dateValue: (order) => order.created_at || order.fecha_entrega,
          sortable: true,
          sortValue: (order) => new Date(order.created_at || order.fecha_entrega || 0).getTime(),
          sortLabels: { asc: "Ingreso (más antiguo)", desc: "Ingreso (más reciente)" },
        },
        {
          key: "entrega",
          label: "Entrega",
          value: (order) => formatDate(order.fecha_salida),
          filterType: "day",
          dateValue: (order) => order.fecha_salida,
          sortable: true,
          sortValue: (order) => new Date(order.fecha_salida || 0).getTime(),
          sortLabels: { asc: "Entrega (más antigua)", desc: "Entrega (más reciente)" },
        },
        {
          key: "dias",
          label: "Días",
          align: "center",
          filter: false,
          value: (order) => daysInShop(order),
          sortable: true,
          sortValue: (order) => daysInShop(order) ?? -1,
          sortLabels: { asc: "Menos días en taller", desc: "Más días en taller" },
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
