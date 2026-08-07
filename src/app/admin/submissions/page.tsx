import type { Metadata } from "next";
import Link from "next/link";
import { getAllSubmissions } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";
import { RealtimeRefresh } from "@/components/admin/realtime-refresh";
import { SubmissionActions } from "@/components/admin/submission-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

const DATETIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const TABS = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

type Status = (typeof TABS)[number]["key"];

/** Renders one answer, linking it if it's a URL the user submitted. */
function Answer({ value }: { value: string }) {
  const isLink = /^https?:\/\//i.test(value);

  if (!isLink) return <span className="break-words">{value}</span>;

  return (
    <a
      href={value}
      target="_blank"
      /* noreferrer as well as noopener — these are user-supplied links and the
         destination has no business knowing which admin page they came from. */
      rel="noopener noreferrer"
      className="break-all underline"
    >
      {value}
    </a>
  );
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();

  const params = await searchParams;
  const raw = typeof params.status === "string" ? params.status : "pending";
  const status: Status = TABS.some((t) => t.key === raw)
    ? (raw as Status)
    : "pending";

  const all = await getAllSubmissions(status);

  return (
    <div className="space-y-6">
      <RealtimeRefresh tables={["submissions"]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground text-sm">
          Nothing is credited until you approve it. New rows appear without a
          reload.
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/submissions?status=${tab.key}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              status === tab.key
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {all.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              {status === "pending"
                ? "Nothing waiting — the queue is clear."
                : "Nothing here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* One card per submission rather than a table row. The answers can run
           to several fields of free text and a screenshot link, which a cell
           squeezes into unreadability — and the decision buttons need room to
           sit next to what they are deciding on. */
        <ul className="space-y-4">
          {all.map((sub) => (
            <li key={sub.id}>
              <Card>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{sub.task.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {sub.user.fullName ?? "—"} · {sub.user.email}
                        {sub.user.phone ? ` · ${sub.user.phone}` : ""}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {DATETIME.format(sub.createdAt)}
                      </p>
                    </div>

                    <div className="flex flex-none items-center gap-2">
                      <Badge
                        variant={
                          sub.status === "approved"
                            ? "default"
                            : sub.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {sub.status === "pending"
                          ? "Waiting"
                          : sub.status === "approved"
                            ? "Approved"
                            : "Rejected"}
                      </Badge>
                      <Badge variant="outline" className="tabular-nums">
                        {sub.coinsAwarded} coins
                      </Badge>
                    </div>
                  </div>

                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {Object.entries(sub.data).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-muted-foreground text-xs">{key}</dt>
                        <dd>
                          <Answer value={value} />
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {sub.adminNote ? (
                    <p className="text-muted-foreground border-l-2 pl-3 text-sm whitespace-pre-line">
                      {sub.adminNote}
                    </p>
                  ) : null}

                  {sub.status === "pending" ? (
                    <SubmissionActions
                      id={sub.id}
                      coins={sub.coinsAwarded}
                      userName={sub.user.fullName ?? sub.user.email}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
