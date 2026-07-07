import { redirect } from "next/navigation";

// Usuarios se fusiono con Mantenedores bajo Configuración (pestaña "Usuarios").
export default function UsersPageRedirect() {
  redirect("/erp/mantenedores?tipo=usuarios");
}
