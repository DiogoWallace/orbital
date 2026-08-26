import Link from "next/link";
import { AuthCard } from "@/components/layout/AuthCard";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata = { title: "Nova senha" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const { token, email } = await searchParams;

  // Link truncado por cliente de e-mail, ou visita direta à URL: sem token não
  // há o que fazer aqui, e um formulário vazio só produziria um erro no envio.
  if (!token || !email) {
    return (
      <AuthCard
        titulo="Link incompleto"
        descricao="O endereço não traz o código de recuperação. Alguns programas de e-mail cortam links longos — copie o endereço inteiro da mensagem, ou peça um novo."
      >
        <Link href="/esqueci-senha" className="btn btn-primary btn-block py-2.5">
          Pedir um novo link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      titulo="Escolher nova senha"
      descricao={
        <>
          Para <span className="tabular">{email}</span>. Ao confirmar, as sessões
          abertas em outros dispositivos são encerradas.
        </>
      }
    >
      <ResetPasswordForm token={token} email={email} />
    </AuthCard>
  );
}
