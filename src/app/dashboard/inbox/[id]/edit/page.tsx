import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getOwnSubmission } from "@/lib/queries";
import { EditSubmissionForm } from "@/components/dashboard/edit-submission-form";
import { TaskDetail } from "@/components/dashboard/task-detail";

export const metadata: Metadata = { title: "Edit submission" };
export const dynamic = "force-dynamic";

/**
 * Correct a submission that hasn't been approved.
 *
 * A page rather than a panel inside the inbox card. Rewriting an answer means
 * re-reading the rules it has to satisfy, and those don't fit in a card that is
 * mostly a verdict — so this shows the whole task above the form, exactly as
 * the task page does, with the previous answers already filled in.
 */
export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await requireUser();
  const { id } = await params;

  const submission = await getOwnSubmission(id, profile.id);
  if (!submission) notFound();

  /* Approved is final — the coins are already in the balance, and letting the
     answers change afterwards would rewrite the thing that was approved. */
  if (submission.status === "approved") redirect("/dashboard/inbox");

  const rejected = submission.status === "rejected";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/inbox"
        className="mono text-xs font-bold underline"
      >
        ← Inbox
      </Link>

      <TaskDetail task={submission.task} showLink={submission.task.isActive} />

      {/* The admin's own words, kept in view while the form is being fixed —
          plain text with line breaks, never markup. */}
      {submission.adminNote ? (
        <div className="ink-card p-5">
          <span
            className="sticker"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Why it wasn&rsquo;t approved
          </span>
          <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">
            {submission.adminNote}
          </p>
        </div>
      ) : null}

      <EditSubmissionForm
        submissionId={submission.id}
        schema={submission.task.formSchema}
        answers={submission.data}
        rejected={rejected}
      />
    </div>
  );
}
