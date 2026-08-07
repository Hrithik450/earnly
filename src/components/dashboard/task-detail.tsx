import type { Task } from "@/lib/drizzle/schema";

/**
 * The task itself — reward, description, link and rules.
 *
 * Shared by the task page and the edit page. Someone correcting a rejected
 * submission needs the same rules in front of them as someone doing it for the
 * first time; sending them back to the task page to re-read the instructions
 * and then forward again to type is the flow this avoids.
 */
export function TaskDetail({
  task,
  showLink,
}: {
  task: Task;
  /** Hidden once there is nothing left to go and do. */
  showLink: boolean;
}) {
  return (
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

      {task.externalUrl && showLink ? (
        <a
          href={task.externalUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mono mt-6 inline-flex items-center gap-2 rounded-full border-2 border-[var(--ink)] px-5 py-2.5 text-sm font-bold text-white"
          style={{ background: "var(--ink)" }}
        >
          Open the task ↗
        </a>
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
    </div>
  );
}
