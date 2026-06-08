import { redirect } from "next/navigation";

export default function WorkOrderEntryRedirect() {
  redirect("/erp/ordenes?tab=ingreso");
}
