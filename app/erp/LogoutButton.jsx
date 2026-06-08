"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/erp/logout", { method: "POST" });
    router.replace("/erp/login");
    router.refresh();
  }

  return (
    <button className="ghost-button compact-button" type="button" onClick={logout} title="Cerrar sesion">
      <LogOut size={17} aria-hidden="true" />
      Salir
    </button>
  );
}
