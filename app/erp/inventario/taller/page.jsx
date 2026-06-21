import Shell from "../../Shell";
import { getInventoryItems, getInventoryProviders, getInventoryStats } from "@/lib/inventory";
import { getDevices, getEquipment, getParts } from "@/lib/maintainers";
import InventoryModule from "../InventoryModule";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function WorkshopInventoryPage() {
  const [page, stats, brands, devices, parts, providers] = await Promise.all([
    getInventoryItems({ area: "taller", paginate: true, page: 1, pageSize: PAGE_SIZE }),
    getInventoryStats("taller"),
    getEquipment(),
    getDevices(),
    getParts(),
    getInventoryProviders("taller"),
  ]);

  return (
    <Shell active="inventario-taller" title="Inventario Taller">
      <InventoryModule
        area="taller"
        title="Taller"
        initialItems={page.items}
        initialTotal={page.total}
        pageSize={PAGE_SIZE}
        stats={stats}
        brands={brands}
        devices={devices}
        parts={parts}
        providers={providers}
      />
    </Shell>
  );
}
