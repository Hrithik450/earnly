"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { approveSubmission, rejectSubmission } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Approve or reject one submission.
 *
 * Approving credits real coins that can be redeemed for a real gift card, and
 * neither decision can be set back to pending — so both go through a
 * confirmation rather than firing on a single click.
 *
 * The rejection note is required. It is the entire message the user gets in
 * their inbox, and a rejection with no reason is the one that turns into a
 * support email.
 */
export function SubmissionActions({
  id,
  coins,
  userName,
}: {
  id: string;
  coins: number;
  userName: string;
}) {
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error: string } | { ok: true }>) {
    startTransition(async () => {
      const result = await action();

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      setMode(null);
      setNote("");
      toast.success("Done.");
    });
  }

  return (
    <>
      <div className="flex flex-none gap-2">
        <Button size="sm" onClick={() => setMode("approve")} disabled={pending}>
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMode("reject")}
          disabled={pending}
        >
          Reject
        </Button>
      </div>

      <Dialog
        open={mode !== null}
        onOpenChange={(next) => {
          if (!next && !pending) setMode(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "approve"
                ? `Credit ${coins} coins to ${userName}?`
                : `Reject ${userName}'s submission?`}
            </DialogTitle>
            <DialogDescription>
              {mode === "approve"
                ? "The coins go into their balance straight away and can be redeemed. This can't be undone."
                : "No coins are credited, and they can submit this task again. Your reason goes to their inbox word for word."}
            </DialogDescription>
          </DialogHeader>

          {mode === "reject" ? (
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="The screenshot doesn't show your username — send it again with the profile visible."
              disabled={pending}
              autoFocus
            />
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setMode(null)}
            >
              Back
            </Button>
            <Button
              disabled={pending || (mode === "reject" && note.trim().length < 3)}
              onClick={() =>
                run(() =>
                  mode === "approve"
                    ? approveSubmission(id)
                    : rejectSubmission(id, note),
                )
              }
            >
              {pending
                ? "Saving…"
                : mode === "approve"
                  ? `Approve and credit ${coins}`
                  : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
