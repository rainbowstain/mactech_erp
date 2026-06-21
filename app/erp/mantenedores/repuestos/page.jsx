import { redirect } from "next/navigation";

export default function PartsMaintainerRedirect() {
  redirect("/erp/mantenedores?tipo=repuestos");
}
