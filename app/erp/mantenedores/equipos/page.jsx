import { redirect } from "next/navigation";

export default function EquipmentMaintainerRedirect() {
  redirect("/erp/mantenedores?tipo=equipos");
}
