import Shell from "../Shell";
import { getAnnualFinanceReport, getFinanceInsights, getFinanceSummary } from "@/lib/finance";
import FinanceDashboard from "./FinanceDashboard";

export const dynamic = "force-dynamic";

export default async function FinancePage({ searchParams }) {
  const params = await searchParams;
  const period = { year: params?.year, month: params?.month };
  const summary = await getFinanceSummary(period);
  const [annualRows, insights] = await Promise.all([
    getAnnualFinanceReport(summary.year),
    getFinanceInsights(summary),
  ]);

  return (
    <Shell active="finanzas-dashboard" title="Finanzas">
      <FinanceDashboard summary={summary} annualRows={annualRows} insights={insights} />
    </Shell>
  );
}
