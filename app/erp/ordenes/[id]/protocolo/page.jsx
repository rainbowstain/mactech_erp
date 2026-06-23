import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatDateTime, formatMoney, textOrDash } from "@/lib/format";
import { getOrder } from "@/lib/orders";
import { FaInstagram, FaTiktok, FaFacebookF, FaYoutube } from "react-icons/fa6";
import PrintButton from "../PrintButton";
import TermsQr from "../TermsQr";

export const dynamic = "force-dynamic";

function PrintField({ label, value, className }) {
  return (
    <div className={className ? `legacy-print-field ${className}` : "legacy-print-field"}>
      <p>{label}:</p>
      <div>{textOrDash(value)}</div>
    </div>
  );
}

function AnswerPill({ yes, children }) {
  return <span className={yes ? "legacy-pill yes" : "legacy-pill no"}>{children}</span>;
}

export default async function OrderProtocolPage({ params }) {
  const { id } = await params;
  const order = await getOrder(id);

  if (!order) notFound();

  const quotedRepairs = Array.from(new Set((order.repuestos || []).map((part) => part.producto).filter(Boolean)));
  const protocolDescription =
    quotedRepairs.join(" / ") || order.reparacion_nombre || order.observacion || "Diagnostico";
  const protocolTotal =
    order.repuestos?.reduce((sum, part) => sum + Number(part.total_venta || 0), 0) ||
    Number(order.total || 0) ||
    Number(order.total_recepcion || 0);

  return (
    <main className="print-page protocol-print-page">
      <div className="print-actions no-print">
        <Link className="ghost-button compact-button" href={`/erp/ordenes/${order.id}`}>
          Volver
        </Link>
        <PrintButton label="Imprimir protocolo" />
      </div>

      <article className="legacy-print-sheet legacy-protocol-sheet">
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

        <section className="legacy-info-box">
          <div className="legacy-print-grid cols-4">
            <div>
              <PrintField label="Nombre" value={order.cliente_nombre} />
              <PrintField label="Marca" value={order.equipo_nombre} />
            </div>
            <div>
              <PrintField label="Rut" value={order.cliente_run} />
              <PrintField label="Modelo" value={order.dispositivo_nombre} />
            </div>
            <div>
              <PrintField label="Telefono" value={order.cliente_fono} />
              <PrintField label="Imei" value={order.imei} />
            </div>
            <div>
              <PrintField label="E-mail" value={order.cliente_mail} className="is-email" />
              <PrintField label="Codigo Acceso" value={order.codigo} />
            </div>
          </div>
        </section>

        <section className="legacy-checklist">
          <div className="legacy-check-row">
            <strong>¿el equipo se encuentra encendido?</strong>
            <AnswerPill yes={order.estado_dispositivo === 1}>
              {order.estado_dispositivo === 1 ? "Si" : order.estado_dispositivo === 3 ? "Bloqueado" : "No"}
            </AnswerPill>
          </div>
          <div className="legacy-check-grid">
            {order.responses.map((response) => (
              <div className="legacy-check-row" key={response.id}>
                <strong>{textOrDash(response.pregunta || response.respuesta)}</strong>
                <AnswerPill yes={response.check_resp}>{response.check_resp ? "Si" : "No"}</AnswerPill>
              </div>
            ))}
            {!order.responses.length ? <p>Sin checklist registrado.</p> : null}
          </div>
        </section>

        <section className="legacy-protocol-observation">
          <div className="legacy-observation-box">
            <strong>{textOrDash(protocolDescription)}</strong>
            {order.observacion ? <p>{textOrDash(order.observacion)}</p> : null}
          </div>
          <div className="legacy-signature-box">
            <p>Firma</p>
          </div>
          <div className="legacy-value-box">
            <h2>{formatMoney(protocolTotal)}</h2>
          </div>
        </section>

        <TermsQr />

        <footer className="legacy-protocol-footer">
          <div>Nombre del Tecnico: {textOrDash(order.tecnico)}</div>
          <div>Fecha de Ingreso: {formatDateTime(order.created_at)}</div>
          <div>Fecha acordada de Entrega: {formatDate(order.fecha_entrega)}</div>
        </footer>
      </article>
    </main>
  );
}
