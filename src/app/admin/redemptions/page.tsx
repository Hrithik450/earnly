import type { Metadata } from "next";
import { getAllRedemptions } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { RealtimeRefresh } from "@/components/admin/realtime-refresh";
import { RedemptionActions } from "@/components/admin/redemption-actions";
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

export const metadata: Metadata = { title: "Redemptions" };
export const dynamic = "force-dynamic";

const DATETIME = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

const STATUS_VARIANT = {
  pending: "default",
  issued: "secondary",
  rejected: "destructive",
} as const;

export default async function AdminRedemptionsPage() {
  await requireAdmin();

  const all = await getAllRedemptions();
  const pending = all.filter((r) => r.status === "pending");
  const settled = all.filter((r) => r.status !== "pending");

  return (
    <div className="space-y-6">
      <RealtimeRefresh tables={["redemptions"]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Redemptions</h1>
        <p className="text-muted-foreground text-sm">
          Buy the card, then paste its code in — that&rsquo;s what debits the
          coins and delivers it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Awaiting a card ({pending.length})
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
                  <TableHead>Card</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Their balance</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {DATETIME.format(r.createdAt)}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{r.user.fullName ?? "—"}</p>
                      <p className="text-muted-foreground text-xs">
                        {r.user.email}
                      </p>
                    </TableCell>
                    <TableCell className="font-medium">{r.brandName}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      ₹{r.amountCoins.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.user.coinsBalance.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <RedemptionActions
                        id={r.id}
                        amount={r.amountCoins}
                        brandName={r.brandName}
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
                  <TableHead>Card</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settled.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {r.processedAt ? DATETIME.format(r.processedAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.user.fullName ?? r.user.email}
                    </TableCell>
                    <TableCell className="text-sm">{r.brandName}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      ₹{r.amountCoins.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status]}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs text-xs">
                      {r.adminNote ?? "—"}
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
