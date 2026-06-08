import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDateTime, formatMoney, textOrDash } from "@/lib/format";
import { getSaleReceipt } from "@/lib/finance";
import ReceiptPrintButton from "./ReceiptPrintButton";

export const dynamic = "force-dynamic";

function receiptDescription(item) {
  return item.descripcion || item.producto || "Producto";
}

export default async function SaleReceiptPage({ params }) {
  const { id } = await params;
  const sale = await getSaleReceipt(id);

  if (!sale || sale.tipo !== "producto") notFound();

  return (
    <main className="print-page receipt-print-page">
      <div className="print-actions receipt-actions no-print">
        <Link className="ghost-button compact-button" href="/erp/ventas/productos">
          Volver
        </Link>
        <ReceiptPrintButton auto />
      </div>

      <article className="receipt-sheet">
        <header className="receipt-header">
          <img src="/brand/mactech-logo-color-trim.png" alt="MacTech" />
          <h1>BOLETA MACTECH</h1>
          <p>Comprobante interno de venta</p>
        </header>

        <section className="receipt-company">
          <strong>MacTech Servicio Tecnico</strong>
          <span>RUT: -</span>
          <span>mactech.cl</span>
          <span>contacto@mactech.cl</span>
          <span>Arica, Chile</span>
        </section>

        <section className="receipt-meta">
          <div>
            <span>N venta</span>
            <strong>{sale.id}</strong>
          </div>
          <div>
            <span>Fecha</span>
            <strong>{formatDateTime(sale.fecha)}</strong>
          </div>
          <div>
            <span>Pago</span>
            <strong>{textOrDash(sale.metodo_pago)}</strong>
          </div>
          <div>
            <span>Vendedor</span>
            <strong>{textOrDash(sale.responsable)}</strong>
          </div>
        </section>

        <table className="receipt-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <strong>{receiptDescription(item)}</strong>
                  <span>{[item.marca, item.codigo_barra].filter(Boolean).join(" / ")}</span>
                </td>
                <td>{item.cantidad}</td>
                <td>{formatMoney(item.precio_unitario)}</td>
                <td>{formatMoney(item.total)}</td>
              </tr>
            ))}
            {!sale.items.length ? (
              <tr>
                <td colSpan="4">Sin detalle de productos.</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {sale.notas ? (
          <section className="receipt-notes">
            <span>Notas</span>
            <p>{sale.notas}</p>
          </section>
        ) : null}

        <section className="receipt-total">
          <span>Total pagado</span>
          <strong>{formatMoney(sale.total_bruto)}</strong>
        </section>

        <footer className="receipt-footer">
          <strong>Gracias por tu compra</strong>
          <span>Comprobante interno, no reemplaza documento tributario electronico.</span>
        </footer>
      </article>
    </main>
  );
}
