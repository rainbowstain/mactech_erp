import { redirect } from "next/navigation";

export default function DevicesMaintainerRedirect() {
  redirect("/erp/mantenedores?tipo=dispositivos");
}
