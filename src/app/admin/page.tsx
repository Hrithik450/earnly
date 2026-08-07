import type { Metadata } from "next";
import Link from "next/link";
import { getAdminStats, getAllSubmissions } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { RealtimeRefresh } from "@/components/admin/realtime-refresh";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const DATETIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [stats, recent] = await Promise.all([
    getAdminStats(),
    getAllSubmissions(8),
  ]);

  return (
    <div className="space-y-6">
      <RealtimeRefresh tables={["submissions", "redemptions"]} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm">
            Live counts across the platform.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/tasks/new">New task</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={stats.users} />
        <Stat label="Active tasks" value={stats.activeTasks} />
        <Stat label="Submissions" value={stats.submissions} />
        <Stat
          label="Pending redemptions"
          value={stats.pendingRedemptions}
          hint={`${stats.pendingCoins.toLocaleString("en-IN")} coins requested`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cards issued to date</CardTitle>
          <CardDescription>
            Total coins debited for delivered redemptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">
            {stats.issuedCoins.toLocaleString("en-IN")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Latest submissions</CardTitle>
            <CardDescription>Updates as they arrive.</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/submissions">View all</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No submissions yet.
            </p>
          ) : (
            <ul className="divide-y">
              {recent.map((sub) => (
                <li
                  key={sub.id}
                  className="flex items-center justify-between gap-4 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{sub.task.title}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {sub.user.fullName ?? sub.user.email}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-3">
                    <span className="text-muted-foreground text-xs">
                      {DATETIME.format(sub.createdAt)}
                    </span>
                    <span className="font-medium tabular-nums">
                      +{sub.coinsAwarded}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">
          {value.toLocaleString("en-IN")}
        </CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}
