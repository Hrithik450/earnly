import type { Metadata } from "next";
import { getAllWithdrawals } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { RealtimeRefresh } from "@/components/admin/realtime-refresh";
import { WithdrawalActions } from "@/components/admin/withdrawal-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Withdrawals" };
export const dynamic = "force-dynamic";

const DATETIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const STATUS_VARIANT = {
  pending: "default",
  paid: "secondary",
  rejected: "destructive",
} as const;

export default async function AdminWithdrawalsPage() {
  await requireAdmin();

  const all = await getAllWithdrawals();
  const pending = all.filter((w) => w.status === "pending");
  const settled = all.filter((w) => w.status !== "pending");

  return (
    <div className="space-y-6">
      <RealtimeRefresh tables={["withdrawals"]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Withdrawals</h1>
        <p className="text-muted-foreground text-sm">
          Send the money yourself, then mark the request paid — that&rsquo;s what
          debits the points.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Awaiting payment ({pending.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <p className="text-muted-foreground px-6 pb-6 text-sm">
              Nothing waiting. New requests appear here without a reload.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Send to</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Their balance</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {DATETIME.format(w.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{w.user.fullName ?? "—"}</p>
                      <p className="text-muted-foreground text-xs">
                        {w.user.email}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{w.destination}</p>
                      <p className="text-muted-foreground text-xs uppercase">
                        {w.method}
                      </p>
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      ₹{w.amountPoints.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{w.user.pointsBalance.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <WithdrawalActions
                        id={w.id}
                        amount={w.amountPoints}
                        method={w.method}
                        destination={w.destination}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {settled.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Processed</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Sent to</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settled.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {w.processedAt ? DATETIME.format(w.processedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {w.user.fullName ?? w.user.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {w.destination}
                      <span className="text-muted-foreground text-xs uppercase">
                        {" "}
                        {w.method}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{w.amountPoints.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[w.status]}>
                        {w.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs text-xs">
                      {w.adminNote ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
