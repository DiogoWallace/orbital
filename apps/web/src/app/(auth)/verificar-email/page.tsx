import Link from "next/link";
import { AuthCard } from "@/components/layout/AuthCard";
import { VerifyEmailRunner } from "./VerifyEmailRunner";

export const metadata = { title: "Confirmar e-mail" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  if (!token || !email) {
    return (
      <AuthCard
        titulo="Link incompleto"
        descricao="O endereço não traz o código de confirmação. Entre na plataforma e peça um novo pelo aviso no topo da página."
      >
        <Link href="/login" className="btn btn-primary btn-block py-2.5">
          Ir para o login
        </Link>
      </AuthCard>
    );
  }

  // Sem título aqui: o `VerifyEmailRunner` tem um por desfecho — confirmando,
  // confirmado, não deu — e um título fixo por cima diria a coisa errada em
  // dois dos três casos.
  return (
    <AuthCard>
      <VerifyEmailRunner token={token} email={email} />
    </AuthCard>
  );
}
