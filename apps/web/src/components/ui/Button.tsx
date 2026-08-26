import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Botão.
 *
 * A aparência inteira vem das classes `.btn*` do Nocturne — este componente só
 * traduz a variante em nome de classe e repassa o resto. Foi de propósito:
 * enquanto o botão desenhado e o botão implementado compartilharem o mesmo
 * seletor, um redesign do sistema chega aqui sem passar por um arquivo `.tsx`.
 *
 * Nenhuma variante é preenchida. Sobre um fundo desta profundidade um botão
 * sólido vira a superfície mais clara da tela e rouba a atenção do conteúdo —
 * o contorno de acento chama o suficiente.
 */
type Variant = "primary" | "secondary" | "ghost" | "outline";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  // `outline` é o nome antigo do secundário. Mantido como apelido para não
  // reescrever as chamadas espalhadas pelas telas que ainda não foram tocadas.
  outline: "btn-secondary",
  ghost: "btn-ghost",
};

export function Button({
  children,
  variant = "secondary",
  block = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
  block?: boolean;
}) {
  return (
    <button
      className={cn("btn", variants[variant], block && "btn-block", className)}
      {...props}
    >
      {children}
    </button>
  );
}
