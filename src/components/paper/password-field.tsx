"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A password field with a reveal toggle.
 *
 * Kept apart from `InkField` because the toggle needs state, and `paper/form`
 * is imported by server components that must not be pulled into the client
 * bundle.
 */
export function InkPasswordField({
  label,
  caption,
  error,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type"> & {
  label: string;
  caption?: ReactNode;
  error?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealed ? "text" : "password"}
          className={cn("ink-input pr-12", className)}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <button
          type="button"
          onClick={() => setRevealed((v) => !v)}
          disabled={props.disabled}
          /* Not focusable: the field itself is, and a stop between password and
             confirm-password would slow down every keyboard sign-in to save a
             glance. Screen readers reach it through the form's control list. */
          tabIndex={-1}
          aria-label={revealed ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 grid w-12 place-content-center rounded-r-[0.7rem] disabled:opacity-40"
        >
          {revealed ? (
            <EyeOff className="size-4" aria-hidden />
          ) : (
            <Eye className="size-4" aria-hidden />
          )}
        </button>
      </div>
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
    </div>
  );
}
