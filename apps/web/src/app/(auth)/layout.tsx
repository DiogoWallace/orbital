import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid-paper flex min-h-dvh flex-col items-center justify-center px-6">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span aria-hidden className="block size-2.5 rounded-full bg-[var(--accent)]" />
        <span className="text-sm font-semibold tracking-tight">Orbital</span>
      </Link>

      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
