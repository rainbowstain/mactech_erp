import Link from "next/link";
import { formatDate, formatMoney, textOrDash } from "@/lib/format";

export default function OrdersTable({ orders, actionLabel = "Ver" }) {
  if (!orders.length) {
    return <div className="empty-state">No hay ordenes para mostrar.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>OT</th>
            <th>Cliente</th>
            <th>Equipo</th>
            <th>Estado</th>
            <th>Fecha</th>
            <th>Total</th>
            <th className="text-center">Accion</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <Link className="table-link" href={`/erp/ordenes/${order.id}`}>
                  #{order.id}
                </Link>
              </td>
              <td>
                <strong>{textOrDash(order.cliente_nombre)}</strong>
                <span className="subtext">{textOrDash(order.cliente_run)}</span>
              </td>
              <td>
                {textOrDash(order.equipo_nombre)}
                <span className="subtext">{textOrDash(order.dispositivo_nombre)}</span>
              </td>
              <td>
                <span className="pill">{textOrDash(order.estado_nombre || order.estado)}</span>
              </td>
              <td>{formatDate(order.created_at || order.fecha_entrega)}</td>
              <td>{formatMoney(order.total)}</td>
              <td className="text-center">
                <Link className="ghost-button compact-button" href={`/erp/ordenes/${order.id}`}>
                  {actionLabel}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
