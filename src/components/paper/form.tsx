import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled `.ink-input` field with optional caption and error slot. */
export function InkField({
  label,
  caption,
  error,
  className,
  ...props
}: ComponentProps<"input"> & {
  label: string;
  caption?: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input
        className={cn("ink-input", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {caption && !error ? (
        <span className="caption mt-1.5 block text-xs">{caption}</span>
      ) : null}
      {error ? (
        <span
          className="mt-1.5 block text-xs font-semibold"
          style={{ color: "var(--red)" }}
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** A labelled `.ink-input` select. Options are supplied as children. */
export function InkSelect({
  label,
  caption,
  error,
  className,
  children,
  ...props
}: ComponentProps<"select"> & {
  label: string;
  caption?: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <select
        className={cn("ink-input ink-select", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      >
        {children}
      </select>
      {caption && !error ? (
        <span className="caption mt-1.5 block text-xs">{caption}</span>
      ) : null}
      {error ? (
        <span
          className="mt-1.5 block text-xs font-semibold"
          style={{ color: "var(--red)" }}
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** A labelled `.ink-input` textarea. */
export function InkTextarea({
  label,
  caption,
  error,
  className,
  ...props
}: ComponentProps<"textarea"> & {
  label: string;
  caption?: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <textarea
        className={cn("ink-input resize-y", className)}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {caption && !error ? (
        <span className="caption mt-1.5 block text-xs">{caption}</span>
      ) : null}
      {error ? (
        <span
          className="mt-1.5 block text-xs font-semibold"
          style={{ color: "var(--red)" }}
        >
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** The primary pill button, sized for forms. */
export function InkButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "btn-ink w-full px-5 py-3 text-sm text-white",
        "disabled:pointer-events-none",
        className,
      )}
      style={{ background: "var(--ink)" }}
      {...props}
    >
      {children}
    </button>
  );
}

/** Inline form-level error banner. */
export function InkError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border-2 px-3.5 py-2.5 text-sm font-semibold"
      style={{
        borderColor: "var(--red)",
        color: "var(--red)",
        background: "rgba(232, 68, 44, 0.06)",
      }}
    >
      {children}
    </p>
  );
}
