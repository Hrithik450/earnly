"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Field } from "@/components/dashboard/task-form";
import { InkButton, InkError } from "@/components/paper/form";
import { editSubmission } from "@/lib/actions/tasks";
import type { TaskFormField } from "@/lib/drizzle/schema";

/**
 * The form on the edit page, prefilled with what the user already sent.
 *
 * Fields are rendered by the same `Field` component the original form uses, so
 * a task's schema cannot render one way when submitted and another way when
 * corrected.
 */
export function EditSubmissionForm({
  submissionId,
  schema,
  answers,
  rejected,
}: {
  submissionId: string;
  schema: TaskFormField[];
  answers: Record<string, string>;
  /** A rejection is a correction; a pending edit is just a fix. */
  rejected: boolean;
}) {
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

      toast.success(rejected ? "Sent again" : "Updated", {
        description: rejected
          ? "It's back in the queue for another look."
          : "We'll review the new details.",
      });
      router.push("/dashboard/inbox");
    });
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6">
      <div>
        <h2 className="text-xl">
          {rejected ? "Fix your answers" : "Edit your answers"}
        </h2>
        <p className="caption mt-1 text-sm">
          {rejected
            ? "Change what's needed and send it back. This stays the same submission, so it doesn't use up another attempt."
            : "Your submission hasn't been reviewed yet, so you can still change what you sent."}
        </p>
      </div>

      <InkError>{error}</InkError>

      {schema.map((field) => (
        <Field
          key={field.id}
          field={field}
          disabled={pending}
          defaultValue={answers[field.id] ?? ""}
        />
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <InkButton type="submit" disabled={pending}>
          {pending ? "Saving…" : rejected ? "Send again" : "Save changes"}
        </InkButton>
        <a href="/dashboard/inbox" className="mono text-xs font-bold underline">
          Cancel
        </a>
      </div>
    </form>
  );
}
