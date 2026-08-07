"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { searchRecipients, sendAdminMail } from "@/lib/actions/mail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type MailUser = {
  id: string;
  email: string;
  fullName: string | null;
};

/**
 * Compose and send a one-off email.
 *
 * The picker searches the database instead of holding every user, which changes
 * what "everyone" has to mean: the client can no longer enumerate the user base
 * to select all of it, and if it could, "everyone" would be defined as whatever
 * the browser last happened to load. So it is an explicit audience choice, and
 * the send action resolves the list — an account created a minute ago is
 * included, a blocked one is not.
 *
 * Send is behind a confirmation because an email cannot be recalled.
 */
export function MailComposer({
  initialUsers,
  initialTotal,
  mailableCount,
}: {
  initialUsers: MailUser[];
  initialTotal: number;
  mailableCount: number;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [toEveryone, setToEveryone] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MailUser[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [searching, setSearching] = useState(false);

  /* Selected users are held by id *and* label. A selection can outlive the
     search that produced it — pick someone, search for someone else, and the
     first is no longer in `results` — so the chip has to carry its own name or
     the count would be the only thing left of it. */
  const [selected, setSelected] = useState<Map<string, string>>(new Map());

  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  /* Debounced: each search is a round trip and a database scan, so it runs per
     pause rather than per keystroke. */
  useEffect(() => {
    const timer = setTimeout(async () => {
      setSearching(true);
      const found = await searchRecipients(query);
      setResults(found.rows);
      setTotal(found.total);
      setSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function toggle(user: MailUser) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(user.id)) next.delete(user.id);
      else next.set(user.id, user.fullName ?? user.email);
      return next;
    });
  }

  const recipientCount = toEveryone ? mailableCount : selected.size;
  const ready =
    subject.trim().length >= 3 && body.trim().length >= 10 && recipientCount > 0;

  function send() {
    startTransition(async () => {
      const result = await sendAdminMail({
        subject,
        body,
        audience: toEveryone
          ? { kind: "everyone" }
          : { kind: "selected", ids: [...selected.keys()] },
      });

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setConfirming(false);

      if (result.emailError) {
        toast.warning("Nothing was sent.", {
          description: result.emailError,
          duration: 12000,
        });
        return;
      }

      toast.success(
        `Sent to ${result.sent} user${result.sent === 1 ? "" : "s"}.${
          result.failed ? ` ${result.failed} failed.` : ""
        }`,
      );

      /* Recipients survive the send. Following up with a second message to the
         same people is the common case, and re-picking them by hand is where a
         mistake creeps in. */
      setSubject("");
      setBody("");
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value.slice(0, 160))}
            placeholder="A new batch of tasks just went live"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="body">Message</Label>
          <Textarea
            id="body"
            rows={14}
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 5000))}
            placeholder={
              "Plain text. Leave a blank line between paragraphs.\n\nIt goes out in the usual branded template — you don't need to add a greeting or a sign-off if you don't want to."
            }
            disabled={pending}
          />
          <p className="text-muted-foreground text-xs">
            {body.length}/5000 · Plain text only. Links are sent as-is.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            disabled={!ready || pending}
            onClick={() => setConfirming(true)}
          >
            Review and send
          </Button>
          <p className="text-muted-foreground text-sm">
            {recipientCount === 0
              ? "No recipients picked yet."
              : toEveryone
                ? `Everyone — ${mailableCount.toLocaleString("en-IN")} accounts.`
                : `${selected.size} recipient${selected.size === 1 ? "" : "s"} selected.`}
          </p>
        </div>
      </div>

      <div className="flex h-fit flex-col rounded-lg border">
        <div className="space-y-3 border-b p-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={toEveryone}
              onChange={(e) => setToEveryone(e.target.checked)}
              disabled={pending}
              className="mt-0.5 size-4 flex-none"
            />
            <span>
              <span className="block text-sm font-medium">
                Send to everyone
              </span>
              <span className="text-muted-foreground block text-xs">
                All {mailableCount.toLocaleString("en-IN")} accounts, resolved
                when you send.
              </span>
            </span>
          </label>

          {!toEveryone ? (
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email"
              disabled={pending}
              aria-label="Search recipients"
            />
          ) : null}
        </div>

        {toEveryone ? (
          <p className="text-muted-foreground p-4 text-sm">
            Picking individual recipients is off while this is on.
          </p>
        ) : (
          <>
            {selected.size > 0 ? (
              <div className="flex flex-wrap gap-1.5 border-b p-3">
                {[...selected].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Map(prev);
                        next.delete(id);
                        return next;
                      })
                    }
                    className="bg-muted rounded-full px-2.5 py-1 text-xs"
                  >
                    {label} ×
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelected(new Map())}
                  disabled={pending}
                  className="text-muted-foreground px-1 text-xs underline underline-offset-2"
                >
                  Clear all
                </button>
              </div>
            ) : null}

            <div
              className="max-h-[22rem] overflow-y-auto p-1"
              style={{ opacity: searching ? 0.6 : 1 }}
            >
              {results.length === 0 ? (
                <p className="text-muted-foreground p-3 text-sm">
                  {query ? `Nobody matches “${query}”.` : "Nobody to email yet."}
                </p>
              ) : (
                results.map((user) => (
                  <label
                    key={user.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-2"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(user.id)}
                      onChange={() => toggle(user)}
                      disabled={pending}
                      className="size-4 flex-none"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {user.fullName ?? "No name"}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {user.email}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>

            {/* Says so rather than silently showing the first fifty — a
                truncated list that looks complete is how someone concludes a
                person has no account. */}
            {total > results.length ? (
              <p className="text-muted-foreground border-t p-3 text-xs">
                Showing {results.length} of {total.toLocaleString("en-IN")}. Type
                more to narrow it down.
              </p>
            ) : null}
          </>
        )}
      </div>

      <Dialog
        open={confirming}
        onOpenChange={(next) => {
          if (!next && !pending) setConfirming(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {toEveryone
                ? `Send to all ${mailableCount.toLocaleString("en-IN")} users?`
                : `Send to ${selected.size} user${selected.size === 1 ? "" : "s"}?`}
            </DialogTitle>
            <DialogDescription>
              Each person gets their own copy — nobody sees anyone else&rsquo;s
              address. An email can&rsquo;t be recalled once it&rsquo;s gone.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">{subject}</p>
            <p className="text-muted-foreground mt-2 line-clamp-4 text-sm whitespace-pre-line">
              {body}
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setConfirming(false)}
            >
              Back
            </Button>
            <Button disabled={pending} onClick={send}>
              {pending ? "Sending…" : `Send to ${recipientCount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
