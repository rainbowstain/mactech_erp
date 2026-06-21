import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect("/erp");

  return (
    <main className="login-shell">
      <section className="login-card" aria-label="Inicio de sesion MacTech">
        <span className="login-logo-mark" role="img" aria-label="MacTech" />
        <p className="login-version">ERP V1</p>
        <LoginForm />
        <Link className="login-back" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a la web
        </Link>
      </section>
    </main>
  );
}
