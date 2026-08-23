import { cn } from "@/lib/utils";

/**
 * Avatar por iniciais.
 *
 * Não há upload de imagem ainda — a coluna `avatar_path` existe e fica nula.
 * Iniciais sobre uma cor derivada do próprio username dão identidade visual
 * estável sem inventar um serviço de imagens, e sem cair no Gravatar, que
 * exige mandar o hash do e-mail de cada leitor para um terceiro.
 */
export function Avatar({
  name,
  username,
  size = "md",
  className,
}: {
  name: string;
  username: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tamanhos = {
    sm: "size-7 text-[10px]",
    md: "size-9 text-xs",
    lg: "size-16 text-lg",
  };

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium",
        "border border-[var(--color-line-strong)] text-[var(--color-void)]",
        tamanhos[size],
        className,
      )}
      style={{ backgroundColor: corPara(username) }}
    >
      {iniciais(name)}
    </span>
  );
}

function iniciais(name: string): string {
  const partes = name.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Cor estável a partir do username.
 *
 * Matiz derivado de um hash simples, com saturação e luminosidade fixas: a
 * mesma pessoa tem sempre a mesma cor, e nenhuma delas fica escura demais para
 * o texto por cima nem clara demais para o fundo da página.
 */
function corPara(username: string): string {
  let hash = 0;

  for (let i = 0; i < username.length; i++) {
    hash = (hash * 31 + username.charCodeAt(i)) % 360;
  }

  return `oklch(0.78 0.11 ${hash})`;
}
