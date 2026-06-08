import Shell from "../../Shell";
import { getFinanceTranches } from "@/lib/finance";
import TranchesModule from "./TranchesModule";

export const dynamic = "force-dynamic";

export default async function FinanceTranchesPage() {
  const tranches = await getFinanceTranches();

  return (
    <Shell active="finanzas-tramos" title="Tramos">
      <TranchesModule tranches={tranches} />
    </Shell>
  );
}
