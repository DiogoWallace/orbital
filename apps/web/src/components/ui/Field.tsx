import { cn } from "@/lib/utils";

/**
 * Campo de formulário com rótulo e erro.
 *
 * Nasceu dentro do `AuthForm`. Promovido para cá no terceiro formulário que
 * precisou dele — recuperação e redefinição de senha —, seguindo a regra da
 * arquitetura: abstrair na primeira ocorrência é como se cria a abstração
 * errada.
 *
 * O `aria-describedby` é o que faz o leitor de tela anunciar o erro junto do
 * campo; sem ele a mensagem existe visualmente e some para quem não enxerga.
 * `aria-invalid` faz dobradinha: além de anunciar, é ele que a folha de estilo
 * usa para pintar a borda de erro, então o estado tem uma fonte só.
 */
export function Field({
  label,
  name,
  errors,
  hint,
  action,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
  /** Link auxiliar alinhado ao rótulo — "Esqueci", tipicamente. */
  action?: React.ReactNode;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className={cn("field", className)}>
      {action ? (
        <div className="flex items-baseline justify-between">
          <label htmlFor={name}>{label}</label>
          {action}
        </div>
      ) : (
        <label htmlFor={name}>{label}</label>
      )}

      <input
        id={name}
        name={name}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : hint ? hintId : undefined}
        className="input"
        {...props}
      />

      {errors ? (
        <p id={errorId} className="mt-1.5 text-xs text-[var(--color-signal-danger)]">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-[var(--color-neutral-500)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
