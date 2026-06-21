import Shell from "../../Shell";
import { getInventoryItems, getInventoryStats } from "@/lib/inventory";
import InventoryModule from "../InventoryModule";

export const dynamic = "force-dynamic";

export default async function InventoryProductsPage() {
  const [items, stats] = await Promise.all([
    getInventoryItems({ area: "productos" }),
    getInventoryStats("productos"),
  ]);

  return (
    <Shell active="inventario-productos" title="Inventario Productos">
      <InventoryModule area="productos" title="Productos" initialItems={items} stats={stats} brands={[]} devices={[]} parts={[]} />
    </Shell>
  );
}
