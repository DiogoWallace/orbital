import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <Panel className="p-6">
      <h1 className="text-lg font-medium tracking-tight">Recuperar senha</h1>
      <p className="mt-1 mb-6 text-xs text-[var(--color-ink-faint)]">
        Informe o e-mail da conta. Enviamos um link para você escolher uma senha nova.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-center text-xs text-[var(--color-ink-faint)]">
        Lembrou a senha?{" "}
        <Link href="/login" className="text-[var(--accent)] hover:underline">
          Voltar para o login
        </Link>
      </p>
    </Panel>
  );
}
