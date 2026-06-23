import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatMoney, textOrDash } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { FaInstagram, FaTiktok, FaFacebookF, FaYoutube } from "react-icons/fa6";
import PrintButton from "../PrintButton";
import TermsQr from "../TermsQr";

export const dynamic = "force-dynamic";

function PrintField({ label, value }) {
  return (
    <div className="legacy-print-field">
      <p>{label}:</p>
      <div>{textOrDash(value)}</div>
    </div>
  );
}

export default async function OrderPdfPage({ params }) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  return (
    <main className="print-page work-order-print-page">
      <div className="print-actions no-print">
        <Link className="ghost-button compact-button" href={`/erp/ordenes/${order.id}`}>
          Volver
        </Link>
        <PrintButton />
      </div>

      <article className="legacy-print-sheet">
        <header className="legacy-print-header">
          <div className="legacy-print-logo">
            <img src="/brand/mactech-logo-dark.svg" alt="MacTech" />
          </div>
          <div className="legacy-print-company">
            <h5>Reparaciones Tecnológicas MacTech Arica SpA</h5>
            <h5>Rut: 78.090.844-0</h5>
            <h5>Bolognesi #340 Local 18</h5>
            <h5>+56 9 5633 3621 · contacto@mactech.cl</h5>
            <h5>www.mactech.cl</h5>
            <h5 className="legacy-print-socials">
              <FaInstagram aria-hidden="true" />
              <FaTiktok aria-hidden="true" />
              <FaFacebookF aria-hidden="true" />
              <FaYoutube aria-hidden="true" />
              <span>@mactech.cl</span>
            </h5>
          </div>
          <div className="legacy-print-number">
            <h3>ORDEN DE TRABAJO</h3>
            <p>{order.id}</p>
          </div>
        </header>

        <section className="legacy-print-summary">
          <div className="legacy-info-box work-order-info">
            <div className="legacy-print-grid cols-3">
              <div>
                <PrintField label="Nombre" value={order.cliente_nombre} />
                <PrintField label="Contacto" value={order.cliente_fono} />
                <PrintField label="Marca" value={order.equipo_nombre} />
              </div>
              <div>
                <PrintField label="Rut" value={order.cliente_run} />
                <PrintField label="E-mail" value={order.cliente_mail} />
                <PrintField label="Dispositivo" value={order.dispositivo_nombre} />
              </div>
              <div>
                <PrintField label="Fecha de Ingreso" value={formatDateTime(order.created_at)} />
                <PrintField label="Fecha de Entrega" value={formatDate(order.fecha_entrega)} />
                <PrintField label="Serie" value={order.imei} />
              </div>
            </div>
          </div>
          <div className="legacy-stamp">
            <h3>TIMBRE</h3>
            <div />
          </div>
        </section>

        <section className="legacy-print-section">
          <h3>OBSERVACION:</h3>
          <div className="legacy-round-box">{textOrDash(order.observacion)}</div>
        </section>

        <section className="legacy-print-section">
          <h3>DIAGNOSTICOS:</h3>
          <div className="legacy-round-box tall">
            {order.revisions.map((revision) => (
              <p key={revision.id}>
                <strong>{formatDateTime(revision.created_at)}:</strong> {textOrDash(revision.observacion)}
              </p>
            ))}
            {!order.revisions.length ? <p>Sin diagnostico.</p> : null}
          </div>
        </section>

        <section className="legacy-table-section">
          <table className="legacy-services-table">
            <thead>
              <tr>
                <th>Servicios / Repuestos</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {order.repuestos.map((part) => (
                <tr key={`part-${part.id}`}>
                  <td>{textOrDash(part.producto)}</td>
                  <td>{formatMoney(part.total_venta)}</td>
                </tr>
              ))}
              {order.services.map((service) => (
                <tr key={service.id}>
                  <td>{textOrDash(service.nombre)}</td>
                  <td>{formatMoney(service.precio)}</td>
                </tr>
              ))}
              {!order.services.length && !order.repuestos.length ? (
                <tr>
                  <td colSpan="2">Sin servicios asociados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <TermsQr />

        <footer className="legacy-work-order-footer">
          <div>
            <h5>OT RECEPCIONADA POR</h5>
            <h3>{textOrDash(order.tecnico)}</h3>
            <p>Firma y Timbre</p>
          </div>
          <div>
            <h5>OT RETIRADA POR</h5>
            <hr />
            <p>FIRMA</p>
          </div>
          <div className="legacy-totals-box">
            <div><span>NETO</span><strong>{formatMoney(order.subtotal)}</strong></div>
            <div><span>IVA</span><strong>{formatMoney(order.iva)}</strong></div>
            <div><span>DESCUENTO</span><strong>{formatMoney(order.descuento)}</strong></div>
            <div><span>TOTAL</span><strong>{formatMoney(order.total)}</strong></div>
          </div>
        </footer>
      </article>
    </main>
  );
}
