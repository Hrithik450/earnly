import type { Metadata } from "next";
import { countMailableUsers, searchMailableUsers } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { MailComposer } from "@/components/admin/mail-composer";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Email" };
export const dynamic = "force-dynamic";

/**
 * Ad-hoc email to users.
 *
 * The picker searches the database rather than being handed every user, so this
 * only seeds the first page of results. "Everyone" is resolved at send time in
 * the action, not counted here — this number is for the label.
 */
export default async function AdminMailPage() {
  await requireAdmin();

  const [initial, mailableCount] = await Promise.all([
    searchMailableUsers(""),
    countMailableUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
        <p className="text-muted-foreground text-sm">
          Write to one user or everyone. {mailableCount} account
          {mailableCount === 1 ? "" : "s"} can be emailed — blocked accounts are
          left out.
        </p>
      </div>

      {mailableCount === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              Nobody to email yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <MailComposer
          initialUsers={initial.rows}
          initialTotal={initial.total}
          mailableCount={mailableCount}
        />
      )}

      <p className="text-muted-foreground text-xs">
        Sent through the same branded template as the maintenance notices, one
        delivery per person. There is no unsubscribe link, so keep this for
        things an account holder genuinely needs — a new batch of tasks, a
        payout delay, a policy change.
      </p>
    </div>
  );
}
