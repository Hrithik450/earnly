import type { Metadata } from "next";
import { getMailableUsers } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { MailComposer } from "@/components/admin/mail-composer";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Email" };
export const dynamic = "force-dynamic";

/**
 * Ad-hoc email to users.
 *
 * The whole mailable list is sent to the client so the picker can search
 * without a round trip. It is names and addresses of our own users, shown to an
 * admin who can already read all of it in the Users tab — nothing crosses a
 * boundary here that requireAdmin has not already gated.
 */
export default async function AdminMailPage() {
  await requireAdmin();

  const users = await getMailableUsers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email</h1>
        <p className="text-muted-foreground text-sm">
          Write to one user or everyone. {users.length} account
          {users.length === 1 ? "" : "s"} can be emailed — blocked accounts are
          left out.
        </p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground text-sm">
              Nobody to email yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <MailComposer users={users} />
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
