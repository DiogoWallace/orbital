import Link from "next/link";
import { AuthCard } from "@/components/layout/AuthCard";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      titulo="Recuperar senha"
      descricao="Informe o e-mail da conta. Enviamos um link para você escolher uma senha nova."
      rodape={
        <>
          Lembrou a senha?{" "}
          <Link href="/login" className="text-[var(--color-accent)] hover:underline">
            Voltar para o login
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
