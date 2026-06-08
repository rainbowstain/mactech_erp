import Link from "next/link";
import { notFound } from "next/navigation";
import Shell from "../../Shell";
import { formatDateTime, formatMoney, textOrDash } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import WarrantyButton from "./WarrantyButton";

export const dynamic = "force-dynamic";

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{textOrDash(value)}</strong>
    </div>
  );
}

function ClosedOrderSummary({ order, totalServicios, totalRepuestos }) {
  return (
    <section className="panel closed-order-summary">
      <div className="panel-header">
        <h2>Resumen de cierre</h2>
        <span className="pill green">Cerrada</span>
      </div>
      <div className="closed-summary-grid">
        <div className="closed-summary-card">
          <span>Servicios realizados</span>
          <strong>{formatMoney(totalServicios)}</strong>
          <p>{order.services.length} servicio(s) asociado(s)</p>
        </div>
        <div className="closed-summary-card">
          <span>Repuestos usados</span>
          <strong>{formatMoney(totalRepuestos)}</strong>
          <p>{order.repuestos.length} repuesto(s) asociado(s)</p>
        </div>
        <div className="closed-summary-card">
          <span>Metodo de pago</span>
          <strong>{textOrDash(order.metodopago)}</strong>
          <p>Salida: {formatDateTime(order.fecha_salida)}</p>
        </div>
        <div className="closed-summary-card total">
          <span>Total cobrado</span>
          <strong>{formatMoney(order.total)}</strong>
          <p>Descuento: {formatMoney(order.descuento)}</p>
        </div>
      </div>
      <div className="closed-summary-tables">
        <div className="answer-list">
          <h3>Servicios</h3>
          {order.services.map((service) => (
            <div className="answer-row" key={service.id}>
              <span>{textOrDash(service.nombre)}</span>
              <strong>{formatMoney(service.precio)}</strong>
            </div>
          ))}
          {!order.services.length ? <div className="empty-state compact-empty">Sin servicios.</div> : null}
        </div>
        <div className="answer-list">
          <h3>Repuestos</h3>
          {order.repuestos.map((part) => (
            <div className="answer-row" key={part.id}>
              <span>
                {textOrDash(part.producto)}
                <small>{textOrDash(part.marca)} · Cantidad {part.cantidad}</small>
              </span>
              <strong>{formatMoney(part.total_venta)}</strong>
            </div>
          ))}
          {!order.repuestos.length ? <div className="empty-state compact-empty">Sin repuestos.</div> : null}
        </div>
      </div>
      <div className="closed-total-grid">
        <InfoItem label="Neto" value={formatMoney(order.subtotal)} />
        <InfoItem label="IVA" value={formatMoney(order.iva)} />
        <InfoItem label="Descuento" value={formatMoney(order.descuento)} />
        <InfoItem label="Total" value={formatMoney(order.total)} />
      </div>
    </section>
  );
}

export default async function OrderDetailPage({ params }) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();
  const isClosed = Number(order.estado) === 5;
  const totalRepuestos = order.repuestos.reduce((sum, part) => sum + Number(part.total_venta || 0), 0);
  const totalServicios = order.services.reduce((sum, service) => sum + Number(service.precio || 0), 0);

  return (
    <Shell active="ordenes" title={`Orden #${order.id}`}>
      <div className="page-actions">
        <Link className="ghost-button compact-button" href={isClosed ? "/erp/ordenes?tab=cerradas" : "/erp/ordenes"}>
          Volver
        </Link>
        <Link className="ghost-button compact-button" href={`/erp/ordenes/${order.id}/protocolo`}>
          Protocolo PDF
        </Link>
        <Link className="ghost-button compact-button" href={`/erp/ordenes/${order.id}/pdf`}>
          Orden PDF
        </Link>
        {isClosed ? <WarrantyButton orderId={order.id} /> : null}
      </div>

      {isClosed ? (
        <ClosedOrderSummary order={order} totalServicios={totalServicios} totalRepuestos={totalRepuestos} />
      ) : null}

      <section className="detail-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Datos de recepcion</h2>
            <span className="pill">{textOrDash(order.estado_nombre || order.estado)}</span>
          </div>
          <div className="info-list">
            <InfoItem label="Cliente" value={order.cliente_nombre} />
            <InfoItem label="RUT" value={order.cliente_run} />
            <InfoItem label="Email" value={order.cliente_mail} />
            <InfoItem label="Telefono" value={order.cliente_fono} />
            <InfoItem label="Equipo" value={order.equipo_nombre} />
            <InfoItem label="Dispositivo" value={order.dispositivo_nombre} />
            <InfoItem label="IMEI" value={order.imei} />
            <InfoItem label="Codigo" value={order.codigo} />
            <InfoItem label="Tecnico" value={order.tecnico} />
            <InfoItem label="Metodo pago" value={order.metodopago} />
            <InfoItem label="Fecha ingreso" value={formatDateTime(order.created_at)} />
            <InfoItem label="Fecha entrega" value={formatDateTime(order.fecha_entrega)} />
            <InfoItem label="Total" value={formatMoney(order.total)} />
            <InfoItem label="Recepcion" value={formatMoney(order.total_recepcion)} />
          </div>
          <div className="note-block">
            <span>Observacion</span>
            <p>{textOrDash(order.observacion)}</p>
          </div>
        </article>

        <aside className="panel">
          <div className="panel-header">
            <h2>Servicios</h2>
          </div>
          <div className="answer-list">
            {order.services.length ? (
              order.services.map((service) => (
                <div className="answer-row" key={service.id}>
                  <span>{textOrDash(service.nombre)}</span>
                  <strong>{formatMoney(service.precio)}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">Sin servicios asociados.</div>
            )}
          </div>
        </aside>
      </section>

      <section className="detail-grid section-gap">
        <article className="panel">
          <div className="panel-header">
            <h2>Checklist</h2>
          </div>
          <div className="answer-list">
            {order.responses.length ? (
              order.responses.map((response) => (
                <div className="answer-row" key={response.id}>
                  <span>{textOrDash(response.pregunta || response.respuesta)}</span>
                  <strong>{response.check_resp ? "Si" : textOrDash(response.respuesta)}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">Sin checklist registrado.</div>
            )}
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Revisiones</h2>
          </div>
          <div className="answer-list">
            {order.revisions.length ? (
              order.revisions.map((revision) => (
                <div className="timeline-row" key={revision.id}>
                  <strong>{textOrDash(revision.nombre_estado)}</strong>
                  <span>{formatDateTime(revision.created_at)}</span>
                  <p>{textOrDash(revision.observacion)}</p>
                </div>
              ))
            ) : (
              <div className="empty-state">Sin revisiones registradas.</div>
            )}
          </div>
        </article>
      </section>
    </Shell>
  );
}
