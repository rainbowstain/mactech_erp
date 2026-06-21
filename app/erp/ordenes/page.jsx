import Link from "next/link";
import Shell from "../Shell";
import OrdersTable from "../OrdersTable";
import WorkOrderForm from "../ordentrabajo/WorkOrderForm";
import RevisionWorkflow from "../revision/RevisionWorkflow";
import { formatDateTime, textOrDash } from "@/lib/format";
import { getInventoryItems } from "@/lib/inventory";
import { getDevices, getDeviceStates, getEquipment, getParts, getQuestions, getServices } from "@/lib/maintainers";
import { getClosedOrders, getOrder, getOrders, getReviewOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

const ORDER_TABS = [
  { key: "ingreso", label: "Ingreso" },
  { key: "revision", label: "Revisar" },
  { key: "ordenes", label: "Ordenes" },
  { key: "cerradas", label: "Cerradas" },
];

function tabHref(tab) {
  return `/erp/ordenes?tab=${tab}`;
}

function OrderTabs({ active }) {
  return (
    <section className="maintainer-tabs panel order-tabs-panel">
      <div className="panel-header panel-header-wrap">
        <h2>Ordenes de trabajo</h2>
        <div className="maintainer-tab-list" role="tablist" aria-label="Ordenes">
          {ORDER_TABS.map((tab) => (
            <Link className={`maintainer-tab ${active === tab.key ? "active" : ""}`} href={tabHref(tab.key)} key={tab.key}>
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
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
  const tab = ORDER_TABS.some((item) => item.key === requestedTab) ? requestedTab : "ordenes";
  const search = String(params?.q || "");

  let content = null;

  if (tab === "ingreso") {
    const [equipment, devices, states, questions, parts] = await Promise.all([
      getEquipment(),
      getDevices(),
      getDeviceStates(),
      getQuestions(),
      getParts(),
    ]);
    content = (
      <WorkOrderForm
        equipment={equipment}
        devices={devices}
        states={states}
        questions={questions}
        parts={parts}
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
    const [fullOrder, services, workshopItems] = selectedOrder
      ? await Promise.all([
          getOrder(selectedOrder.id),
          getServices(),
          getInventoryItems({ area: "taller", dispositivoId: selectedOrder.id_dispositivo }),
        ])
      : [null, [], []];

    content = (
      <>
        <ReviewSearch id={id} run={run} nombre={nombre} hasSearch={hasSearch} orders={orders} />
        {fullOrder ? <RevisionWorkflow order={fullOrder} services={services} workshopItems={workshopItems} /> : null}
      </>
    );
  }

  if (tab === "cerradas") {
    const orders = await getClosedOrders({ limit: 300, search });
    content = (
      <section className="panel section-gap">
        <div className="panel-header panel-header-wrap">
          <h2>Ordenes cerradas</h2>
          <form className="search-form">
            <input type="hidden" name="tab" value="cerradas" />
            <input name="q" defaultValue={search} placeholder="Buscar OT cerrada, cliente, RUT o equipo" />
            <button className="ghost-button compact-button" type="submit">
              Buscar
            </button>
          </form>
        </div>
        <OrdersTable orders={orders} />
      </section>
    );
  }

  if (tab === "ordenes") {
    const orders = await getOrders({ limit: 200, search });
    content = (
      <section className="panel section-gap">
        <div className="panel-header panel-header-wrap">
          <h2>Todas las ordenes</h2>
          <form className="search-form">
            <input type="hidden" name="tab" value="ordenes" />
            <input name="q" defaultValue={search} placeholder="Buscar OT, cliente, RUT o equipo" />
            <button className="ghost-button compact-button" type="submit">
              Buscar
            </button>
          </form>
        </div>
        <OrdersTable orders={orders} />
      </section>
    );
  }

  return (
    <Shell active="ordenes" title="Ordenes de trabajo">
      <OrderTabs active={tab} />
      {content}
    </Shell>
  );
}
