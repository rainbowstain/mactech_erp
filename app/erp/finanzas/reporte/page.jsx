import Shell from "../../Shell";
import { getAnnualFinanceReport } from "@/lib/finance";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function chartHeight(value, max) {
  return Math.max(2, Math.round((Number(value || 0) / Math.max(1, max)) * 130));
}

export default async function FinanceReportPage({ searchParams }) {
  const params = await searchParams;
  const year = Number(params?.year || new Date().getFullYear());
  const rows = await getAnnualFinanceReport(year);
  const max = Math.max(1, ...rows.map((row) => Math.max(row.ingresos, row.utilidad_neta, row.monto_eduardo)));

  return (
    <Shell active="finanzas-reporte" title="Reporte Financiero">
      <section className="panel">
        <div className="panel-header panel-header-wrap">
          <h2>Resumen Anual {year}</h2>
          <form className="search-form">
            <input name="year" inputMode="numeric" defaultValue={year} />
            <button className="ghost-button compact-button" type="submit">Ver</button>
          </form>
        </div>
        <div className="annual-report-chart">
          {rows.map((row) => (
            <div className="annual-report-month" key={row.month}>
              <div className="annual-bars">
                <i className="annual-income" style={{ height: chartHeight(row.ingresos, max) }} />
                <i className="annual-profit" style={{ height: chartHeight(Math.max(0, row.utilidad_neta), max) }} />
                <i className="annual-edu" style={{ height: chartHeight(row.monto_eduardo, max) }} />
              </div>
              <strong>{MONTHS[row.month - 1].slice(0, 3)}</strong>
            </div>
          ))}
        </div>
        <div className="finance-chart-legend annual-legend">
          <span><i className="legend-income" />Bruto</span>
          <span><i className="legend-profit" />Liquido / utilidad</span>
          <span><i className="legend-edu" />Eduardo</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mes</th>
                <th>Total Bruto</th>
                <th>Costos</th>
                <th>Gastos</th>
                <th>Publicidad</th>
                <th>Utilidad Neta</th>
                <th>Total Tienda</th>
                <th>% Tienda</th>
                <th>Total Eduardo</th>
                <th>% Eduardo</th>
                <th>Compras/Inversion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month}>
                  <td>{MONTHS[row.month - 1]}</td>
                  <td>{formatMoney(row.ingresos)}</td>
                  <td>{formatMoney(row.costos)}</td>
                  <td>{formatMoney(row.gastos_operativos + row.otros_gastos)}</td>
                  <td>{formatMoney(row.publicidad)}</td>
                  <td><strong>{formatMoney(row.utilidad_neta)}</strong></td>
                  <td>{formatMoney(row.monto_tienda)}</td>
                  <td>{Math.round(row.porcentaje_tienda_promedio * 1000) / 10}%</td>
                  <td>{formatMoney(row.monto_eduardo)}</td>
                  <td>{Math.round(row.porcentaje_eduardo_promedio * 1000) / 10}%</td>
                  <td>{formatMoney(row.compras)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
