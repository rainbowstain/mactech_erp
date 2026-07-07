import Link from "next/link";
import { ArrowRightCircle, BarChart3, Gem, Paperclip, Send, Truck } from "lucide-react";
import Shell from "../Shell";
import OrdersTable from "../OrdersTable";
import WorkOrderForm from "../ordentrabajo/WorkOrderForm";
import RevisionWorkflow from "../revision/RevisionWorkflow";
import { formatDateTime, textOrDash } from "@/lib/format";
import { getInventoryItems } from "@/lib/inventory";
import { getDevices, getDeviceStates, getEquipment, getParts, getQuestions } from "@/lib/maintainers";
import { getOrder, getOrders, getOrderStates, getOrderStats, getReviewOrders } from "@/lib/orders";
import { getUsers, canDeleteOrders } from "@/lib/users";
import { readSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Pestañas visibles. "revision" sigue existiendo como ruta (destino del
// boton "Ver" de la tabla de Ordenes) pero ya no se muestra como pestaña:
// Ordenes ya trae buscador y filtro por estado, asi que duplicaba a Revisar/Cerradas.
const ORDER_TABS = [
  { key: "ingreso", label: "Ingreso" },
  { key: "ordenes", label: "Ordenes" },
];

const VALID_TABS = ["ingreso", "ordenes", "revision"];

function tabHref(tab) {
  return `/erp/ordenes?tab=${tab}`;
}

// Barra de pestañas sin titulo propio: el titulo ya esta en la barra superior
// y repetirlo aqui duplicaba "Ordenes de trabajo" en la misma pantalla.
// Estilo "tabs de navegador": ocupan todo el ancho, la no seleccionada se ve opacada.
function OrderTabs({ active }) {
  return (
    <div className="order-tabs-bar" role="tablist" aria-label="Ordenes">
      {ORDER_TABS.map((tab) => (
        <Link
          className={`order-tab ${active === tab.key ? "active" : ""}`}
          href={tabHref(tab.key)}
          key={tab.key}
          role="tab"
          aria-selected={active === tab.key}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

function StatCard({ href, active, value, label, action, icon: Icon }) {
  return (
    <article className="legacy-dashboard-card">
      <div className="legacy-dashboard-card-main">
        <dl>
          <dt>{value}</dt>
          <dd>{label}</dd>
        </dl>
        <div className="legacy-dashboard-icon">
          <Icon size={20} aria-hidden="true" />
        </div>
      </div>
      <Link className={`legacy-dashboard-card-link ${active ? "active" : ""}`} href={href}>
        <span>{action}</span>
        <ArrowRightCircle size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}

function ReviewSearch({ id, run, nombre, hasSearch, orders }) {
  return (
    <>
      <section className="legacy-block section-gap">
        <div className="legacy-block-header">
          <h2>Buscar Orden de Trabajo</h2>
        </div>
        <form className="revision-search-grid">
          <input type="hidden" name="tab" value="revision" />
          <input type="search" name="id" defaultValue={id} placeholder="ID ORDEN" />
          <input type="search" name="run" defaultValue={run} placeholder="RUN" />
          <input type="search" name="nombre" defaultValue={nombre} placeholder="NOMBRE" />
          <button className="btn-dark-legacy revision-search-button" type="submit">
            Buscar Ordenes
          </button>
        </form>
        {hasSearch && !orders.length ? (
          <div className="empty-state">No se registran datos para la informacion ingresada.</div>
        ) : null}
      </section>

      {hasSearch && orders.length > 1 ? (
        <section className="panel section-gap">
          <div className="panel-header modal-like-header">
            <h2>Ordenes disponibles</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Run</th>
                  <th>Nombre</th>
                  <th>Marca</th>
                  <th>Modelo</th>
                  <th>Fecha Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="table-link" href={`/erp/ordenes?tab=revision&idOrden=${order.id}`}>
                        <strong>{order.id}</strong>
                      </Link>
                    </td>
                    <td>{textOrDash(order.estado_nombre || order.estado)}</td>
                    <td>{textOrDash(order.cliente_run)}</td>
                    <td>{textOrDash(order.cliente_nombre)}</td>
                    <td>{textOrDash(order.equipo_nombre)}</td>
                    <td>{textOrDash(order.dispositivo_nombre)}</td>
                    <td>{formatDateTime(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!hasSearch ? (
        <section className="panel section-gap">
          <div className="empty-state">Ingresa ID de orden, RUN o nombre para buscar.</div>
        </section>
      ) : null}
    </>
  );
}

export default async function OrdersPage({ searchParams }) {
  const params = await searchParams;
  const requestedTab = String(params?.tab || "ordenes");
  const tab = VALID_TABS.includes(requestedTab) ? requestedTab : "ordenes";

  const pageSession = await readSession();
  const canDelete = canDeleteOrders(pageSession);

  let content = null;

  if (tab === "ingreso") {
    const [equipment, devices, states, questions, parts, users, session] = await Promise.all([
      getEquipment(),
      getDevices(),
      getDeviceStates(),
      getQuestions(),
      getParts(),
      getUsers(),
      readSession(),
    ]);
    content = (
      <WorkOrderForm
        equipment={equipment}
        devices={devices}
        states={states}
        questions={questions}
        parts={parts}
        users={users}
        currentUserName={session?.name || session?.email || ""}
      />
    );
  }

  if (tab === "revision") {
    const id = String(params?.idOrden || params?.id || "");
    const run = String(params?.run || "");
    const nombre = String(params?.nombre || "");
    const hasSearch = Boolean(id || run || nombre);
    const orders = hasSearch ? await getReviewOrders({ id, run, nombre, limit: 120 }) : [];
    const selectedOrder = id && orders.length === 1 ? orders[0] : null;
    const [fullOrder, workshopItems] = selectedOrder
      ? await Promise.all([
          getOrder(selectedOrder.id),
          getInventoryItems({ area: "taller", dispositivoId: selectedOrder.id_dispositivo }),
        ])
      : [null, []];

    content = (
      <>
        <ReviewSearch id={id} run={run} nombre={nombre} hasSearch={hasSearch} orders={orders} />
        {fullOrder ? <RevisionWorkflow order={fullOrder} workshopItems={workshopItems} canEditCosts={canDelete} /> : null}
      </>
    );
  }

  if (tab === "ordenes") {
    const estadoParam = Number(params?.estado);
    const estadoFilter = [1, 2, 3, 6].includes(estadoParam) ? estadoParam : null;
    const [orders, stats, orderStates] = await Promise.all([
      getOrders({ limit: 300 }),
      getOrderStats(),
      getOrderStates(),
    ]);
    const filteredOrders = estadoFilter
      ? orders.filter((order) => Number(order.estado) === estadoFilter)
      : orders;
    const cardHref = (estado) => `/erp/ordenes?tab=ordenes${estado ? `&estado=${estado}` : ""}`;

    content = (
      <>
        <section className="legacy-dashboard-grid section-gap">
          <StatCard
            href={cardHref(1)}
            active={estadoFilter === 1}
            value={stats.sin_revisar}
            label="Ordenes sin revisar"
            action="Ver sin revisar"
            icon={Gem}
          />
          <StatCard
            href={cardHref(2)}
            active={estadoFilter === 2}
            value={stats.en_revision}
            label="Ordenes en revision"
            action="Ver en revision"
            icon={Paperclip}
          />
          <StatCard
            href={cardHref(6)}
            active={estadoFilter === 6}
            value={stats.espera_repuesto}
            label="Esperando repuesto"
            action="Ver esperando repuesto"
            icon={Truck}
          />
          <StatCard
            href={cardHref(3)}
            active={estadoFilter === 3}
            value={stats.para_retiro}
            label="Ordenes para retiro"
            action="Ver para retiro"
            icon={Send}
          />
          <StatCard
            href={cardHref(null)}
            active={!estadoFilter}
            value={stats.total}
            label="Total de ordenes"
            action="Ver todas"
            icon={BarChart3}
          />
        </section>

        <section className="panel section-gap">
          <OrdersTable orders={filteredOrders} orderStates={orderStates} canDelete={canDelete} />
        </section>
      </>
    );
  }

  return (
    <Shell active="ordenes" title="Ordenes de trabajo">
      <OrderTabs active={tab === "revision" ? "ordenes" : tab} />
      {content}
    </Shell>
  );
}
