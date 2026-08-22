import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
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
      <Panel className="p-6">
        <h1 className="text-lg font-medium tracking-tight">Link incompleto</h1>
        <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
          O endereço não traz o código de recuperação. Alguns programas de e-mail cortam
          links longos — copie o endereço inteiro da mensagem, ou peça um novo.
        </p>
        <p className="mt-6 text-center text-xs text-[var(--color-ink-faint)]">
          <Link href="/esqueci-senha" className="text-[var(--accent)] hover:underline">
            Pedir um novo link
          </Link>
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <h1 className="text-lg font-medium tracking-tight">Escolher nova senha</h1>
      <p className="mt-1 mb-6 text-xs text-[var(--color-ink-faint)]">
        Para <span className="font-[family-name:var(--font-mono)]">{email}</span>. Ao
        confirmar, as sessões abertas em outros dispositivos são encerradas.
      </p>

      <ResetPasswordForm token={token} email={email} />
    </Panel>
  );
}
