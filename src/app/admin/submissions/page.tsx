import type { Metadata } from "next";
import { getAllSubmissions } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { RealtimeRefresh } from "@/components/admin/realtime-refresh";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

const DATETIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

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

export default async function AdminSubmissionsPage() {
  await requireAdmin();

  const all = await getAllSubmissions();

  return (
    <div className="space-y-6">
      <RealtimeRefresh tables={["submissions"]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground text-sm">
          Everything users have sent, newest first. New rows appear without a
          reload.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {all.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              No submissions yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Answers</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((sub) => (
                  <TableRow key={sub.id} className="align-top">
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {DATETIME.format(sub.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {sub.user.fullName ?? "—"}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {sub.user.email}
                      </p>
                      {sub.user.phone ? (
                        <p className="text-muted-foreground text-xs">
                          {sub.user.phone}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{sub.task.title}</TableCell>
                    <TableCell className="max-w-md">
                      <dl className="space-y-1 text-sm">
                        {Object.entries(sub.data).map(([key, value]) => (
                          <div key={key}>
                            <dt className="text-muted-foreground text-xs">
                              {key}
                            </dt>
                            <dd>
                              <Answer value={value} />
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="tabular-nums">
                        +{sub.coinsAwarded}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
