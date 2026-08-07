"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { sendAdminMail } from "@/lib/actions/mail";
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
 * One recipient control rather than a "single or bulk" mode switch: picking
 * everyone is what "select all" already means, and a mode toggle would only add
 * a way to be in the wrong mode. Search is by name or address, and the list is
 * rendered client-side from a snapshot the server already sent — a user base
 * this size does not need a search endpoint, and typing stays instant.
 *
 * Send is behind a confirmation because an email cannot be recalled.
 */
export function MailComposer({ users }: { users: MailUser[] }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.fullName ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  /* Scoped to what is on screen. With a filter active "select all" meaning the
     whole user base rather than the seven people you just searched for is how
     an email goes to the wrong list. */
  const allShown = matches.length > 0 && matches.every((u) => selected.has(u.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllShown() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const u of matches) {
        if (allShown) next.delete(u.id);
        else next.add(u.id);
      }
      return next;
    });
  }

  const ready =
    subject.trim().length >= 3 && body.trim().length >= 10 && selected.size > 0;

  function send() {
    startTransition(async () => {
      const result = await sendAdminMail({
        subject,
        body,
        recipientIds: [...selected],
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
          <Button disabled={!ready || pending} onClick={() => setConfirming(true)}>
            Review and send
          </Button>
          <p className="text-muted-foreground text-sm">
            {selected.size === 0
              ? "No recipients picked yet."
              : `${selected.size} recipient${selected.size === 1 ? "" : "s"} selected.`}
          </p>
        </div>
      </div>

      <div className="flex h-fit flex-col rounded-lg border">
        <div className="space-y-2 border-b p-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            disabled={pending}
            aria-label="Search recipients"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleAllShown}
              disabled={pending || matches.length === 0}
              className="text-sm font-medium underline underline-offset-2 disabled:opacity-40"
            >
              {allShown
                ? `Clear these ${matches.length}`
                : query.trim()
                  ? `Select these ${matches.length}`
                  : `Select all ${matches.length}`}
            </button>
            {selected.size > 0 ? (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                disabled={pending}
                className="text-muted-foreground text-xs underline underline-offset-2"
              >
                Clear all
              </button>
            ) : null}
          </div>
        </div>

        <div className="max-h-[26rem] overflow-y-auto p-1">
          {matches.length === 0 ? (
            <p className="text-muted-foreground p-3 text-sm">
              Nobody matches “{query}”.
            </p>
          ) : (
            matches.map((user) => {
              const on = selected.has(user.id);
              return (
                <label
                  key={user.id}
                  className="hover:bg-muted flex cursor-pointer items-center gap-3 rounded-md px-2 py-2"
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(user.id)}
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
              );
            })
          )}
        </div>
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
              Send to {selected.size} user{selected.size === 1 ? "" : "s"}?
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
              {pending ? "Sending…" : `Send to ${selected.size}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
