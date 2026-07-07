import { redirect } from "next/navigation";

// El inicio del ERP es la pagina de Ordenes de trabajo: el dashboard viejo
// se fusiono ahi (estadisticas arriba de la tabla de ordenes).
export default function DashboardPage() {
  redirect("/erp/ordenes");
}
