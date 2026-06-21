"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { formatDate, formatMoney, textOrDash } from "@/lib/format";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function pct(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value * 100)}%`;
}

function moneyShort(value) {
  const amount = Number(value || 0);
  if (Math.abs(amount) >= 1000000) return `$${Math.round(amount / 1000000)}M`;
  if (Math.abs(amount) >= 1000) return `$${Math.round(amount / 1000)}K`;
  return formatMoney(amount);
}

function periodLabel(period) {
  if (period === "day") return "Diario";
  if (period === "week") return "Semanal";
  if (period === "year") return "Anual";
  return "Mensual";
}

function inputDateForPeriod(summary) {
  if (summary.period === "year") return `${summary.year}-01-01`;
  return summary.date || summary.start;
}

function EvolutionChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.ingresos, row.utilidad_neta, row.monto_eduardo)));
  const points = rows.map((row, index) => {
    const x = 24 + index * (520 / 11);
    const y = 180 - (Math.max(0, row.utilidad_neta) / max) * 145;
    return `${x},${y}`;
  });

  return (
    <div className="finance-chart-card">
      <div className="finance-chart-heading">
        <h2>Evolucion anual</h2>
        <span>Ingresos, utilidad y reparto</span>
      </div>
      <svg className="finance-chart" viewBox="0 0 590 220" role="img" aria-label="Evolucion financiera anual">
        {rows.map((row, index) => {
          const x = 24 + index * (520 / 11);
          const incomeHeight = (Math.max(0, row.ingresos) / max) * 145;
          const eduHeight = (Math.max(0, row.monto_eduardo) / max) * 145;
          return (
            <g key={row.month}>
              <rect x={x - 12} y={180 - incomeHeight} width="10" height={incomeHeight} className="finance-bar-income" />
              <rect x={x + 2} y={180 - eduHeight} width="10" height={eduHeight} className="finance-bar-edu" />
              <text x={x} y="204" textAnchor="middle">{MONTHS[index].slice(0, 3)}</text>
            </g>
          );
        })}
        <polyline points={points.join(" ")} className="finance-line-profit" />
      </svg>
      <div className="finance-chart-legend">
        <span><i className="legend-income" />Ingresos</span>
        <span><i className="legend-edu" />Eduardo</span>
        <span><i className="legend-profit" />Utilidad neta</span>
      </div>
    </div>
  );
}

function MixChart({ rows, total }) {
  const labels = { historico: "Historico Excel", ot: "OT", producto: "Productos" };
  return (
    <div className="finance-decision-card">
      <h2>Origen de ingresos</h2>
      <div className="finance-mix-list">
        {rows.length ? rows.map((row) => {
          const percent = total > 0 ? Number(row.total || 0) / total : 0;
          return (
            <div key={row.tipo}>
              <span>{labels[row.tipo] || row.tipo}</span>
              <strong>{formatMoney(row.total)}</strong>
              <div className="finance-progress"><i style={{ width: `${Math.round(percent * 100)}%` }} /></div>
            </div>
          );
        }) : <p className="muted">Sin ingresos para este periodo.</p>}
      </div>
    </div>
  );
}

export default function FinanceDashboard({ summary, annualRows, insights, dailyRows = [] }) {
  const router = useRouter();
  const margin = summary.ingresos ? summary.utilidad_neta / summary.ingresos : 0;
  const costRatio = summary.ingresos ? summary.costos / summary.ingresos : 0;
  const expenseRatio = summary.ingresos
    ? (summary.gastos_operativos + summary.publicidad + summary.otros_gastos) / summary.ingresos
    : 0;
  const bestMonth = annualRows.reduce((best, row) => (row.utilidad_neta > best.utilidad_neta ? row : best), annualRows[0]);
  const yearOptions = Array.from({ length: 7 }, (_, index) => summary.year - 3 + index);

  function updatePeriod(patch = {}) {
    const params = new URLSearchParams({
      period: patch.period ?? summary.period ?? "month",
      year: patch.year ?? summary.year,
      month: patch.month ?? summary.month,
      date: patch.date ?? inputDateForPeriod(summary),
    });
    router.push(`/erp/finanzas?${params.toString()}`);
  }

  return (
    <div className="finance-page">
      <section className="legacy-block">
        <div className="legacy-block-header">
          <h2>Resultado {periodLabel(summary.period)}</h2>
          <div className="finance-period-form">
            <CalendarDays size={16} aria-hidden="true" />
            <select value={summary.period || "month"} onChange={(event) => updatePeriod({ period: event.target.value })}>
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mes</option>
              <option value="year">Año</option>
            </select>
            {summary.period === "day" || summary.period === "week" ? (
              <input type="date" value={inputDateForPeriod(summary)} onChange={(event) => updatePeriod({ date: event.target.value })} />
            ) : null}
            <select value={summary.year} onChange={(event) => updatePeriod({ year: event.target.value })} aria-label="Año">
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {summary.period !== "year" ? (
              <select value={summary.month} onChange={(event) => updatePeriod({ month: event.target.value })}>
                {MONTHS.map((month, index) => (
                  <option key={month} value={index + 1}>{month}</option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid-cards finance-stats">
        <div className="stat"><span>Ingresos brutos</span><strong>{formatMoney(summary.ingresos)}</strong></div>
        <div className="stat"><span>Costos directos</span><strong>{formatMoney(summary.costos)}</strong></div>
        <div className="stat"><span>Gastos operativos</span><strong>{formatMoney(summary.gastos_operativos)}</strong></div>
        <div className="stat"><span>Publicidad</span><strong>{formatMoney(summary.publicidad)}</strong></div>
        <div className="stat"><span>Utilidad neta</span><strong>{formatMoney(summary.utilidad_neta)}</strong></div>
        <div className="stat"><span>Compras / inversion</span><strong>{formatMoney(summary.compras)}</strong></div>
        <div className="stat"><span>Eduardo</span><strong>{formatMoney(summary.monto_eduardo)}</strong></div>
        <div className="stat"><span>Tienda</span><strong>{formatMoney(summary.monto_tienda)}</strong></div>
      </section>

      <section className="finance-decision-grid">
        <EvolutionChart rows={annualRows} />
        <div className="finance-decision-card">
          <h2>Indicadores</h2>
          <div className="finance-kpi-list">
            <div><span>Margen neto</span><strong>{pct(margin)}</strong></div>
            <div><span>Costo sobre ventas</span><strong>{pct(costRatio)}</strong></div>
            <div><span>Gastos sobre ventas</span><strong>{pct(expenseRatio)}</strong></div>
            <div><span>Mejor mes</span><strong>{MONTHS[(bestMonth?.month || 1) - 1]} · {moneyShort(bestMonth?.utilidad_neta)}</strong></div>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header"><h2>Detalle del Periodo</h2></div>
        <div className="finance-breakdown">
          <div><span>Ingresos productos</span><strong>{formatMoney(summary.ingresos_productos)}</strong></div>
          <div><span>Ingresos OT</span><strong>{formatMoney(summary.ingresos_ot)}</strong></div>
          <div><span>Ingresos historicos</span><strong>{formatMoney(summary.ingresos_historicos)}</strong></div>
          <div><span>Liquido historico</span><strong>{formatMoney(summary.liquido_historico)}</strong></div>
          <div><span>Otros gastos</span><strong>{formatMoney(summary.otros_gastos)}</strong></div>
          <div><span>% Eduardo promedio</span><strong>{pct(summary.porcentaje_eduardo_promedio)}</strong></div>
          <div><span>% Tienda promedio</span><strong>{pct(summary.porcentaje_tienda_promedio)}</strong></div>
          <div><span>Tramo operativo</span><strong>{summary.tramo_descripcion || "Sin descripcion"}</strong></div>
        </div>
      </section>

      <section className="panel section-gap">
        <div className="panel-header"><h2>{summary.period === "year" ? "Resultado mensual" : "Resultado diario"}</h2></div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{summary.period === "year" ? "Mes" : "Fecha"}</th>
                <th>Ingresos</th>
                <th>Costos</th>
                <th>Gastos</th>
                <th>Utilidad</th>
                <th>OT</th>
                <th>Productos</th>
              </tr>
            </thead>
            <tbody>
              {(summary.period === "year" ? annualRows : dailyRows).map((row) => (
                <tr key={summary.period === "year" ? row.month : row.fecha}>
                  <td>{summary.period === "year" ? MONTHS[(row.month || 1) - 1] : formatDate(row.fecha)}</td>
                  <td>{formatMoney(row.ingresos)}</td>
                  <td>{formatMoney(row.costos)}</td>
                  <td>{formatMoney(summary.period === "year" ? row.gastos_operativos + row.publicidad + row.otros_gastos : row.gastos)}</td>
                  <td><strong>{formatMoney(summary.period === "year" ? row.utilidad_neta : row.utilidad)}</strong></td>
                  <td>{formatMoney(row.ingresos_ot)}</td>
                  <td>{formatMoney(row.ingresos_productos)}</td>
                </tr>
              ))}
              {!(summary.period === "year" ? annualRows : dailyRows).length ? (
                <tr>
                  <td colSpan="7" className="empty-state">Sin movimientos para este periodo.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="finance-decision-grid">
        <MixChart rows={insights.salesMix} total={summary.ingresos} />
        <div className="finance-decision-card">
          <h2>Gastos principales</h2>
          <div className="finance-compact-list">
            {insights.topExpenses.length ? insights.topExpenses.map((expense) => (
              <div key={`${expense.tipo}-${expense.categoria}`}>
                <span>{expense.categoria} · {expense.tipo}</span>
                <strong>{formatMoney(expense.total)}</strong>
              </div>
            )) : <p className="muted">Sin gastos registrados este mes.</p>}
          </div>
        </div>
        <div className="finance-decision-card finance-wide-card">
          <h2>Alertas de inventario</h2>
          <div className="finance-compact-list">
            {insights.lowStock.length ? insights.lowStock.map((item) => (
              <div key={`${item.area}-${item.producto}`}>
                <span>{item.area}: {item.producto} {item.marca ? `· ${item.marca}` : ""}</span>
                <strong>{textOrDash(item.cantidad)} uds</strong>
              </div>
            )) : <p className="muted">Sin alertas de stock bajo.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}
