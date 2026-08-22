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
 */
export function Field({
  label,
  name,
  errors,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
  errors?: string[];
  hint?: string;
}) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-xs text-[var(--color-ink-muted)]">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? errorId : hint ? hintId : undefined}
        className="rounded-[var(--radius-control)] border border-[var(--color-line-strong)] bg-[var(--color-void)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--accent)]"
        {...props}
      />
      {errors ? (
        <p id={errorId} className="text-xs text-[var(--color-signal-danger)]">
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs text-[var(--color-ink-faint)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
