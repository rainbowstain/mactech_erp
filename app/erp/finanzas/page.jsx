import Shell from "../Shell";
import { getAnnualFinanceReport, getFinanceDailyRows, getFinanceInsights, getFinanceSummary } from "@/lib/finance";
import FinanceDashboard from "./FinanceDashboard";

export const dynamic = "force-dynamic";

export default async function FinancePage({ searchParams }) {
  const params = await searchParams;
  const period = { year: params?.year, month: params?.month, period: params?.period, date: params?.date };
  const summary = await getFinanceSummary(period);
  const [annualRows, insights, dailyRows] = await Promise.all([
    getAnnualFinanceReport(summary.year),
    getFinanceInsights(summary),
    getFinanceDailyRows(summary),
  ]);

  return (
    <Shell active="finanzas-dashboard" title="Finanzas">
      <FinanceDashboard summary={summary} annualRows={annualRows} insights={insights} dailyRows={dailyRows} />
    </Shell>
  );
}
