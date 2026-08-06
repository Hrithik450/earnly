import { desc, eq } from "drizzle-orm";
import { getUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { tasks } from "@/lib/drizzle/schema";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Nav } from "@/components/landing/nav";
import { Payouts } from "@/components/landing/payouts";
import { TasksPreview } from "@/components/landing/tasks-preview";

/* The task list and the signed-in state both come from per-request sources, so
   there is nothing here worth caching. */
export const dynamic = "force-dynamic";

/**
 * The public front door.
 *
 * A signed-in visitor is not redirected away — the profile and tasks are meant
 * to be reachable from the landing page, so the nav and CTAs point at the
 * dashboard instead.
 */
export default async function Page() {
  const [user, liveTasks] = await Promise.all([
    getUser(),
    db.query.tasks.findMany({
      where: eq(tasks.isActive, true),
      orderBy: [desc(tasks.points)],
      limit: 6,
    }),
  ]);

  const signedIn = Boolean(user);

  return (
    <div className="paper min-h-svh">
      <Nav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <HowItWorks />
        <TasksPreview tasks={liveTasks} signedIn={signedIn} />
        <Payouts />
        <Faq />
      </main>
      <Footer signedIn={signedIn} />
    </div>
  );
}
