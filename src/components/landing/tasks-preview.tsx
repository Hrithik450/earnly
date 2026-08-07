import Link from "next/link";
import type { Task } from "@/lib/drizzle/schema";
import { relativeTime } from "@/lib/utils";
import { Rise, Stamp } from "./motion";

/** Rotating accents so a long list doesn't read as one grey block. */
const ACCENTS = ["var(--blue)", "var(--green)", "var(--red)", "var(--yellow)"];

export function TasksPreview({
  tasks,
  signedIn,
}: {
  tasks: Task[];
  signedIn: boolean;
}) {
  if (tasks.length === 0) return null;

  /* One `now` for the whole list so every card is measured against the same
     instant — calling new Date() per row can straddle a minute boundary and
     print two different ages for rows written together. */
  const now = new Date();
  const freshest = tasks.reduce<Date>((latest, t) => {
    const at = new Date(t.updatedAt);
    return at > latest ? at : latest;
  }, new Date(0));

  return (
    <section id="tasks" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <Rise>
          <div className="mx-auto max-w-3xl px-6 text-center">
            <span
              className="sticker mb-4 inline-block rotate-[-3deg] shadow-[-2px_2px_0_0_var(--ink)]"
              style={{ backgroundColor: "var(--yellow)" }}
            >
              Open right now
            </span>
            <h2 className="text-[clamp(1.9rem,4vw,2.9rem)]">
              Live tasks you can finish today.
            </h2>
            <p className="caption mx-auto mt-5 max-w-xl text-lg leading-relaxed">
              These are the real tasks currently on the board. Sign in and the
              full list is yours.
            </p>
            <p className="mono mt-5 inline-flex items-center gap-2 text-xs font-bold tracking-[0.1em] uppercase opacity-70">
              <span
                className="inline-block h-2 w-2 flex-none rounded-full"
                style={{ background: "var(--green)" }}
              />
              last updated {relativeTime(freshest, now)}
            </p>
          </div>
        </Rise>

        {/* One list, two layouts. Below `sm` it is a snapping horizontal rail;
            from `sm` up the same children reflow into the grid. Duplicating the
            markup into a separate mobile carousel would mean every future card
            change has to be made twice. */}
        <div className="task-rail mt-16 grid grid-flow-col auto-cols-[82%] gap-5 overflow-x-auto px-6 pb-4 sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
          {tasks.map((task, i) => {
            const accent = ACCENTS[i % ACCENTS.length];
            /* Yellow fails contrast against white text, so it is the one accent
               that keeps black type on it. */
            const onAccent = accent === "var(--yellow)" ? "var(--ink)" : "#fff";

            return (
              <Stamp key={task.id} delay={i * 0.06} className="task-slide">
                <Link
                  href={signedIn ? `/dashboard/tasks/${task.slug}` : "/signup"}
                  className="ink-card ink-lift flex h-full flex-col p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    {task.category ? (
                      <span className="mono text-[0.65rem] font-bold tracking-[0.16em] uppercase opacity-60">
                        {task.category}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span
                      className="mono flex-none rounded-full border-2 border-[var(--ink)] px-2.5 py-0.5 text-xs font-bold"
                      style={{ background: accent, color: onAccent }}
                    >
                      +{task.coins} coins
                    </span>
                  </div>

                  <h3 className="mt-4 text-[1.4rem]">{task.title}</h3>

                  {task.description ? (
                    <p className="caption mt-3 flex-1 text-sm leading-relaxed">
                      {task.description}
                    </p>
                  ) : null}

                  <div className="mt-5 flex items-center justify-between gap-3">
                    <span className="mono text-xs font-bold underline">
                      {signedIn ? "Start task →" : "Sign up to start →"}
                    </span>
                    <span className="mono text-[0.65rem] font-bold tracking-[0.1em] uppercase opacity-55">
                      {relativeTime(task.updatedAt, now)}
                    </span>
                  </div>
                </Link>
              </Stamp>
            );
          })}
        </div>

        <p className="caption mt-4 px-6 text-center text-xs sm:hidden">
          Swipe for more →
        </p>
      </div>
    </section>
  );
}
