import type { Metadata } from "next";
import {
  getUserFacets,
  getUsersPage,
  USERS_PAGE_SIZE,
  type UserFilters as Filters,
} from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { BlockUserButton } from "@/components/admin/block-user-button";
import { Pager } from "@/components/admin/pager";
import { UserFilters } from "@/components/admin/user-filters";
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

/**
 * "3 days ago" rather than a date.
 *
 * Whether someone came back this week is what this column is actually asked,
 * and a date makes you do the subtraction yourself. The exact timestamp is in
 * the title attribute for when it matters.
 */
function sinceLabel(value: Date | null) {
  if (!value) return "Never";

  const days = Math.floor((Date.now() - value.getTime()) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

const STATUSES = new Set(["all", "active", "blocked", "admin"]);

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const params = await searchParams;

  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const status = one("status");
  const filters: Filters = {
    query: one("q"),
    /* Anything else in the URL is ignored rather than passed through — this
       reaches a query builder, and the switch there has no default. */
    status: status && STATUSES.has(status) ? (status as Filters["status"]) : "all",
    industry: one("industry"),
    country: one("country"),
    page: Number(one("page")) || 1,
  };

  const [{ rows, total, page }, facets] = await Promise.all([
    getUsersPage(filters),
    getUserFacets(),
  ]);

  const filtering = Boolean(
    filters.query || filters.industry || filters.country || status !== "all",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground text-sm">
          {total.toLocaleString("en-IN")}
          {filtering ? " matching" : " registered"}
        </p>
      </div>

      <UserFilters
        industries={facets.industries}
        countries={facets.countries}
      />

      <Card>
        <CardContent className="p-0">
          {/* Nine columns of real content, so the row scrolls sideways rather
              than each cell being squeezed to nothing. */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Hobbies</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead className="text-right">Coins</TableHead>
                  <TableHead>Last seen</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-muted-foreground py-10 text-center text-sm"
                    >
                      {filtering
                        ? "Nobody matches those filters."
                        : "No users yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ profile, submissionCount, lastSignInAt }) => {
                    const seen = lastSignInAt ? new Date(lastSignInAt) : null;

                    return (
                      <TableRow key={profile.id}>
                        <TableCell className="min-w-[13rem]">
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
                          {profile.industry ?? (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-sm">
                          {profile.country ? (
                            <>
                              <span className="block">{profile.country}</span>
                              {profile.state ? (
                                <span className="text-muted-foreground block text-xs">
                                  {profile.state}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        {/* Truncated with the full text on hover: hobbies run
                            to 500 characters and one long answer would set the
                            row height for the whole table. */}
                        <TableCell className="max-w-[16rem] text-sm">
                          {profile.hobbies ? (
                            <span
                              className="block truncate"
                              title={profile.hobbies}
                            >
                              {profile.hobbies}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right tabular-nums">
                          {submissionCount}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {profile.coinsBalance.toLocaleString("en-IN")}
                        </TableCell>

                        <TableCell
                          className="text-muted-foreground text-sm whitespace-nowrap"
                          title={seen ? seen.toLocaleString("en-IN") : undefined}
                        >
                          {sinceLabel(seen)}
                        </TableCell>

                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Pager page={page} total={total} pageSize={USERS_PAGE_SIZE} />
    </div>
  );
}
