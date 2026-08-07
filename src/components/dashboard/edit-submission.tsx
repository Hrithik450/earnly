"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InkButton, InkError } from "@/components/paper/form";
import { Field } from "@/components/dashboard/task-form";
import { editSubmission } from "@/lib/actions/tasks";
import type { TaskFormField } from "@/lib/drizzle/schema";

/**
 * Fix the answers on a submission that hasn't been decided yet.
 *
 * Opens in place in the inbox rather than sending the user back to the task
 * page, because the thing they need to read while correcting it — the admin's
 * reason for rejecting — is on this card, not that one.
 *
 * The form is collapsed by default. Most visits to the inbox are to check on
 * something, not to rewrite it, and the answers already sent are the wrong
 * thing to lead with when the interesting content is the verdict.
 */
export function EditSubmission({
  submissionId,
  schema,
  answers,
  rejected,
}: {
  submissionId: string;
  schema: TaskFormField[];
  answers: Record<string, string>;
  /** Changes the copy — a rejection is a correction, a pending edit is a fix. */
  rejected: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await editSubmission(submissionId, formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      setOpen(false);
      toast.success(rejected ? "Sent again" : "Updated", {
        description: rejected
          ? "It's back in the queue for another look."
          : "We'll review the new details.",
      });
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mono text-xs font-bold underline"
      >
        {rejected ? "Fix and send again →" : "Edit details →"}
      </button>
    );
  }

  return (
    <form
      action={onSubmit}
      className="mt-4 w-full space-y-4 rounded-2xl border-2 border-[var(--ink)] p-4"
      style={{ background: "var(--cream)" }}
    >
      <p className="mono text-[0.62rem] font-bold tracking-[0.16em] uppercase opacity-60">
        {rejected ? "Fix your answers" : "Edit your answers"}
      </p>

      <InkError>{error}</InkError>

      {schema.map((field) => (
        <Field
          key={field.id}
          field={field}
          disabled={pending}
          defaultValue={answers[field.id] ?? ""}
        />
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <InkButton type="submit" disabled={pending}>
          {pending ? "Saving…" : rejected ? "Send again" : "Save changes"}
        </InkButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={pending}
          className="mono text-xs font-bold underline"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
