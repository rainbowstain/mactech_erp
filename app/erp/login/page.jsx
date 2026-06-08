import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const session = await readSession();
  if (session) redirect("/erp");

  return (
    <main className="login-shell">
      <section className="legacy-login-stage" aria-label="Inicio de sesion MacTech">
        <div className="legacy-login-art" aria-hidden="true">
          <span className="legacy-login-orbit legacy-login-orbit-a" />
          <span className="legacy-login-orbit legacy-login-orbit-b" />
          <span className="legacy-login-device" />
        </div>
        <div className="legacy-login-panel">
          <div className="brand-mark">
            <span className="login-logo" aria-hidden="true" />
            <strong>MacTech</strong>
            <span>Ordenes de trabajo y taller</span>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
