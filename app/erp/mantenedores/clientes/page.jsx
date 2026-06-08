import { redirect } from "next/navigation";

export default function ClientsMaintainerRedirect() {
  redirect("/erp/mantenedores?tipo=clientes");
}
