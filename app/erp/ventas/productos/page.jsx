import Shell from "../../Shell";
import { getInventoryItems } from "@/lib/inventory";
import { getRecentSales } from "@/lib/finance";
import ProductSalesModule from "./ProductSalesModule";

export const dynamic = "force-dynamic";

export default async function ProductSalesPage() {
  const [items, recentSales] = await Promise.all([
    getInventoryItems({ area: "productos" }),
    getRecentSales(50),
  ]);

  return (
    <Shell active="ventas-productos" title="Venta de Productos">
      <ProductSalesModule initialItems={items} recentSales={recentSales} />
    </Shell>
  );
}
