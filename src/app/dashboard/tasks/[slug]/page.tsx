import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { getTaskBySlug, hasCompleted } from "@/lib/queries";
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

  const done = await hasCompleted(task.id, profile.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/dashboard" className="mono text-xs font-bold underline">
        ← All tasks
      </Link>

      <div className="ink-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {task.category ? (
            <span className="mono text-[0.65rem] font-bold tracking-[0.16em] uppercase opacity-60">
              {task.category}
            </span>
          ) : (
            <span />
          )}
          <span
            className="mono flex-none rounded-full border-2 border-[var(--ink)] px-3 py-1 text-sm font-bold text-white"
            style={{ background: "var(--green)" }}
          >
            +{task.coins} coins
          </span>
        </div>

        <h1 className="mt-4 text-3xl sm:text-4xl">{task.title}</h1>

        {task.description ? (
          <p className="caption mt-3 leading-relaxed">{task.description}</p>
        ) : null}

        {task.instructions ? (
          <div
            className="mt-6 rounded-2xl border-2 border-[var(--ink)] p-4"
            style={{ background: "var(--cream)" }}
          >
            <span className="mono text-[0.62rem] font-bold tracking-[0.16em] uppercase opacity-60">
              What to do
            </span>
            {/* Plain text with newlines preserved — admin instructions are never
                treated as markup. */}
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line">
              {task.instructions}
            </p>
          </div>
        ) : null}

        {/* Only rendered when the task is still open: sending someone off to do
            work they can no longer claim for is worse than not offering the
            link at all. The URL is validated to http(s) on the way in. */}
        {task.externalUrl && task.isActive && !done ? (
          <a
            href={task.externalUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="mono mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white"
            style={{ background: "var(--ink)" }}
          >
            Go to the task ↗
          </a>
        ) : null}
      </div>

      {done ? (
        <div className="ink-card p-6">
          <span
            className="sticker"
            style={{ background: "var(--green)", color: "#fff" }}
          >
            Completed
          </span>
          <p className="caption mt-3 text-sm">
            You&rsquo;ve already claimed this one. The {task.coins} coins are in
            your balance.
          </p>
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
        />
      )}
    </div>
  );
}
