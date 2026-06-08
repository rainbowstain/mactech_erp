import { redirect } from "next/navigation";

export default function ServicesMaintainerRedirect() {
  redirect("/erp/mantenedores?tipo=servicios");
}
