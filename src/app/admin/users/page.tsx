import type { Metadata } from "next";
import { getAllUsers } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { BlockUserButton } from "@/components/admin/block-user-button";
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

export const metadata: Metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const rows = await getAllUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          {rows.length} registered
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Payout details</TableHead>
                <TableHead className="text-right">Tasks</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ profile, submissionCount }) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {profile.fullName ?? "—"}
                      </span>
                      {profile.isAdmin ? (
                        <Badge variant="secondary">Admin</Badge>
                      ) : null}
                      {profile.isBlocked ? (
                        <Badge variant="destructive">Blocked</Badge>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {profile.email}
                    </p>
                    {profile.phone ? (
                      <p className="text-muted-foreground text-xs">
                        {profile.phone}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">
                    {profile.upiId ? (
                      <p>
                        <span className="text-muted-foreground text-xs">
                          UPI{" "}
                        </span>
                        {profile.upiId}
                      </p>
                    ) : null}
                    {profile.paytmNumber ? (
                      <p>
                        <span className="text-muted-foreground text-xs">
                          Paytm{" "}
                        </span>
                        {profile.paytmNumber}
                      </p>
                    ) : null}
                    {!profile.upiId && !profile.paytmNumber ? (
                      <span className="text-muted-foreground text-xs">
                        None added
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {submissionCount}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    ₹{profile.pointsBalance.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {DATE.format(profile.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <BlockUserButton
                      userId={profile.id}
                      isBlocked={profile.isBlocked}
                      self={profile.id === admin.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
