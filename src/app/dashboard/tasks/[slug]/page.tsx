import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getTaskAttempts, getTaskBySlug } from "@/lib/queries";
import { TaskDetail } from "@/components/dashboard/task-detail";
import { TaskForm } from "@/components/dashboard/task-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const task = await getTaskBySlug(slug);
  return { title: task?.title ?? "Task" };
}

export default async function TaskPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const profile = await requireUser();
  const { slug } = await params;

  const task = await getTaskBySlug(slug);
  if (!task) notFound();

  const attempts = await getTaskAttempts(task.id, profile.id);
  const left =
    task.maxCompletions === null
      ? null
      : Math.max(0, task.maxCompletions - attempts.used);
  const done = left === 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard" className="mono text-xs font-bold underline">
        ← All tasks
      </Link>

      <TaskDetail task={task} showLink={task.isActive && !done} />

      {attempts.rejected > 0 && attempts.pending === 0 ? (
        /* A rejected attempt is reworked in place, so the form here would file a
           second row for the same piece of work. The fix lives in the inbox
           next to the reason it was turned down. */
        <div className="ink-card p-6">
          <span
            className="sticker"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Needs a fix
          </span>
          <p className="caption mt-3 text-sm">
            We couldn&rsquo;t approve your last submission. Your inbox has the
            reason and the form to correct it — sending it again from there
            doesn&rsquo;t use up another attempt.
          </p>
          <Link
            href="/dashboard/inbox"
            className="btn-ink mt-4 inline-block bg-white px-5 py-2.5 text-sm"
          >
            Open inbox
          </Link>
        </div>
      ) : done ? (
        <div className="ink-card p-6">
          <span
            className="sticker"
            style={{
              background: attempts.pending > 0 ? "var(--yellow)" : "var(--green)",
              color: attempts.pending > 0 ? "var(--ink)" : "#fff",
            }}
          >
            {attempts.pending > 0 ? "In review" : "Completed"}
          </span>
          <p className="caption mt-3 text-sm">
            {attempts.pending > 0
              ? `We're checking your submission. Once it's approved the ${task.coins} coins land in your balance.`
              : `You've already claimed this one. The ${task.coins} coins are in your balance.`}
          </p>
          <Link
            href="/dashboard/inbox"
            className="btn-ink mt-4 inline-block bg-white px-5 py-2.5 text-sm"
          >
            Open inbox
          </Link>
        </div>
      ) : !task.isActive ? (
        <div className="ink-card p-6">
          <span className="sticker" style={{ background: "var(--yellow)" }}>
            Closed
          </span>
          <p className="caption mt-3 text-sm">
            This task is no longer accepting submissions.
          </p>
        </div>
      ) : task.formSchema.length === 0 ? (
        <div className="ink-card p-6">
          <p className="caption text-sm">
            This task isn&rsquo;t ready yet — its form hasn&rsquo;t been set up.
          </p>
        </div>
      ) : (
        <TaskForm
          taskId={task.id}
          coins={task.coins}
          schema={task.formSchema}
          attemptsLeft={left}
          pending={attempts.pending}
        />
      )}
    </div>
  );
}
