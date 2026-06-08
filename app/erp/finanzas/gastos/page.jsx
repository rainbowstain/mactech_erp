import Shell from "../../Shell";
import { getFinanceExpenses, getRecurringExpenses, monthRange } from "@/lib/finance";
import ExpensesModule from "./ExpensesModule";

export const dynamic = "force-dynamic";

export default async function FinanceExpensesPage({ searchParams }) {
  const params = await searchParams;
  const range = monthRange({ year: params?.year, month: params?.month });
  const [expenses, recurring] = await Promise.all([
    getFinanceExpenses(range),
    getRecurringExpenses(),
  ]);

  return (
    <Shell active="finanzas-gastos" title="Gastos">
      <ExpensesModule expenses={expenses} recurring={recurring} year={range.year} month={range.month} />
    </Shell>
  );
}
