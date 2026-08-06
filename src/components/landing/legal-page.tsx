import type { ReactNode } from "react";
import { Logo } from "@/components/brand/logo";

/**
 * Shared shell for the two legal pages. They carry no nav and no footer — a
 * reader who arrived from the footer wants the text, and the full chrome would
 * put the links they just clicked back under the document.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="paper min-h-svh px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-2xl">
        <Logo size="sm" />

        <h1 className="mt-8 text-[clamp(2rem,5vw,3rem)] leading-[1.05]">
          {title}
        </h1>
        <p className="mono mt-4 text-xs font-bold tracking-[0.14em] uppercase opacity-55">
          Last updated {updated}
        </p>

        <div className="legal-body mt-10">{children}</div>

        <p className="caption mt-14 border-t-2 border-[var(--ink)] pt-6 text-sm leading-relaxed">
          Questions about anything on this page? Reach us from your dashboard and
          a person will reply.
        </p>
      </div>
    </div>
  );
}
