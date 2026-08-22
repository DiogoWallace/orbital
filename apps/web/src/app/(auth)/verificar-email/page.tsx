import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
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
      <Panel className="p-6">
        <h1 className="text-lg font-medium tracking-tight">Link incompleto</h1>
        <p className="mt-2 text-xs text-[var(--color-ink-faint)]">
          O endereço não traz o código de confirmação. Entre na plataforma e peça um novo
          pelo aviso no topo da página.
        </p>
        <p className="mt-6 text-center text-xs text-[var(--color-ink-faint)]">
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Ir para o login
          </Link>
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="p-6">
      <VerifyEmailRunner token={token} email={email} />
    </Panel>
  );
}
