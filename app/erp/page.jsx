import Link from "next/link";
import { ArrowRightCircle, BarChart3, Gem, Paperclip, Send } from "lucide-react";
import Shell from "./Shell";
import { formatDate, formatMoney, textOrDash } from "@/lib/format";
import { getPendingDashboard } from "@/lib/orders";

export const dynamic = "force-dynamic";

function statusClass(estado) {
  if (estado === 3) return "green";
  if (estado === 2) return "";
  if (estado === 1) return "yellow";
  return "gray";
}

function DashboardCard({ href, active, value, label, action, icon: Icon }) {
  return (
    <article className="legacy-dashboard-card">
      <div className="legacy-dashboard-card-main">
        <dl>
          <dt>{value}</dt>
          <dd>{label}</dd>
        </dl>
        <div className="legacy-dashboard-icon">
          <Icon size={28} aria-hidden="true" />
        </div>
      </div>
      <Link className={`legacy-dashboard-card-link ${active ? "active" : ""}`} href={href}>
        <span>{action}</span>
        <ArrowRightCircle size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const estado = params?.estado ? Number(params.estado) : null;
  const { stats, orders } = await getPendingDashboard();
  const filteredOrders = estado ? orders.filter((order) => order.estado === estado) : orders;

  return (
    <Shell active="dashboard" title="Ordenes Pendientes">
      <section className="legacy-page-title">
        <h1>Ordenes Pendientes</h1>
      </section>

      <section className="legacy-dashboard-grid">
        <DashboardCard
          href="/erp?estado=1"
          active={estado === 1}
          value={stats.total_iniciadas}
          label="Ordenes Sin Revisar"
          action="Ver Ordenes sin revision"
          icon={Gem}
        />
        <DashboardCard
          href="/erp?estado=2"
          active={estado === 2}
          value={stats.total_revision}
          label="Ordenes en Revision"
          action="Ver Ordenes en revision"
          icon={Paperclip}
        />
        <DashboardCard
          href="/erp?estado=3"
          active={estado === 3}
          value={stats.total_retiro}
          label="Ordenes para Retiro"
          action="Ver Ordenes para retiro"
          icon={Send}
        />
        <DashboardCard
          href="/erp"
          active={!estado}
          value={stats.total}
          label="Total de Ordenes"
          action="Ver Todas las ordenes"
          icon={BarChart3}
        />
      </section>

      <section className="panel">
        <div className="panel-header legacy-recent-header">
          <h2>Ordenes recientes</h2>
          <div className="legacy-dashboard-tools">
            <Link className="ghost-button compact-button" href="/erp/ordenes?tab=revision">
              Buscar
            </Link>
            <Link className="ghost-button compact-button" href="/erp/ordenes">
              Todas
            </Link>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Orden Nº</th>
                <th>Cliente</th>
                <th>Dispositivo</th>
                <th className="text-center">Estado Orden</th>
                <th className="text-center">Ingreso</th>
                <th className="text-center">Entrega</th>
                <th className="text-center">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link className="table-link" href={`/erp/ordenes?tab=revision&idOrden=${order.id}`}>
                      #{order.id}
                    </Link>
                  </td>
                  <td>
                    <strong>{textOrDash(order.cliente_nombre)}</strong>
                    <span className="subtext">{textOrDash(order.cliente_run)}</span>
                  </td>
                  <td>
                    <strong>{textOrDash(order.equipo_nombre)}</strong>
                    <span className="subtext">{textOrDash(order.dispositivo_nombre)}</span>
                  </td>
                  <td className="text-center">
                    <span className={`pill ${statusClass(order.estado)}`}>
                      {textOrDash(order.estado_nombre || order.estado)}
                    </span>
                  </td>
                  <td className="text-center">{formatDate(order.created_at)}</td>
                  <td className="text-center">{formatDate(order.fecha_entrega)}</td>
                  <td className="text-center">
                    <strong>{formatMoney(order.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredOrders.length ? <div className="empty-state">No hay ordenes pendientes para mostrar.</div> : null}
        </div>
      </section>
    </Shell>
  );
}
