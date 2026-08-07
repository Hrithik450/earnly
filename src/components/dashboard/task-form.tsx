"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InkButton, InkError } from "@/components/paper/form";
import { submitTask } from "@/lib/actions/tasks";
import type { TaskFormField } from "@/lib/drizzle/schema";

/**
 * Renders a task's admin-defined form.
 *
 * `required` and the input types are mirrored here for the browser's own
 * validation, but they are not the check that matters — the server re-validates
 * every field against the same schema, since this markup is trivially bypassed.
 */
export function TaskForm({
  taskId,
  coins,
  schema,
  attemptsLeft,
  pending: inReview,
}: {
  taskId: string;
  coins: number;
  schema: TaskFormField[];
  /** Null when the task has no completion limit. */
  attemptsLeft: number | null;
  /** How many of this user's submissions are still awaiting review. */
  pending: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await submitTask(taskId, formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      toast.success("Sent for review", {
        description: `If it's approved, ${result.coins} coins go to your balance. Watch your inbox.`,
      });
      router.push("/dashboard/inbox");
    });
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6">
      <div>
        <h2 className="text-xl">Submit your proof</h2>
        <p className="caption mt-1 text-sm">
          We check every submission by hand. Once it&rsquo;s approved the{" "}
          {coins} coins land in your balance — you&rsquo;ll find the result in
          your inbox.
          {attemptsLeft !== null && attemptsLeft > 1
            ? ` You can do this task ${attemptsLeft} more times.`
            : ""}
        </p>
        {inReview > 0 ? (
          <p className="caption mt-2 text-sm">
            {inReview} earlier submission{inReview === 1 ? "" : "s"} of yours
            {inReview === 1 ? " is" : " are"} still being reviewed.
          </p>
        ) : null}
      </div>

      <InkError>{error}</InkError>

      {schema.map((field) => (
        <Field key={field.id} field={field} disabled={pending} />
      ))}

      <InkButton type="submit" disabled={pending}>
        {pending ? "Submitting…" : "Submit for review"}
      </InkButton>
    </form>
  );
}

function Field({
  field,
  disabled,
}: {
  field: TaskFormField;
  disabled: boolean;
}) {
  const label = (
    <span className="mb-1.5 block text-sm font-semibold">
      {field.label}
      {field.required ? (
        <span style={{ color: "var(--red)" }}> *</span>
      ) : (
        <span className="caption font-normal"> (optional)</span>
      )}
    </span>
  );

  if (field.type === "textarea") {
    return (
      <label className="block">
        {label}
        <textarea
          name={field.id}
          rows={4}
          placeholder={field.placeholder}
          required={field.required}
          disabled={disabled}
          maxLength={4000}
          className="ink-input resize-y"
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="block">
        {label}
        <select
          name={field.id}
          required={field.required}
          disabled={disabled}
          defaultValue=""
          className="ink-input"
        >
          <option value="" disabled>
            Choose one…
          </option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }

  /* `image` collects a link to a screenshot rather than a file. There is no
     storage bucket wired up, and a URL keeps the whole flow on the free tier. */
  const isLink = field.type === "url" || field.type === "image";

  return (
    <label className="block">
      {label}
      <input
        name={field.id}
        type={field.type === "number" ? "number" : isLink ? "url" : "text"}
        inputMode={field.type === "number" ? "numeric" : undefined}
        placeholder={
          field.placeholder ??
          (field.type === "image" ? "https://… link to your screenshot" : undefined)
        }
        required={field.required}
        disabled={disabled}
        maxLength={4000}
        className="ink-input"
      />
      {field.type === "image" ? (
        <span className="caption mt-1.5 block text-xs">
          Upload your screenshot anywhere public (Google Drive, Imgur) and paste
          the link.
        </span>
      ) : null}
    </label>
  );
}
