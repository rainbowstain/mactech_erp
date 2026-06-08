import Shell from "../../Shell";
import { getInventoryItems, getInventoryStats } from "@/lib/inventory";
import InventoryModule from "../InventoryModule";

export const dynamic = "force-dynamic";

export default async function WorkshopInventoryPage() {
  const [items, stats] = await Promise.all([
    getInventoryItems({ area: "taller" }),
    getInventoryStats("taller"),
  ]);

  return (
    <Shell active="inventario-taller" title="Inventario Taller">
      <InventoryModule area="taller" title="Taller" initialItems={items} stats={stats} />
    </Shell>
  );
}
