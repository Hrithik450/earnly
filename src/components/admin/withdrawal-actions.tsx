"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { markWithdrawalPaid, rejectWithdrawal } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Mode = "paid" | "rejected";

/**
 * Two-step confirmation for a payout decision.
 *
 * Both outcomes are effectively irreversible from the panel — marking paid
 * debits the points, and neither status can be set back to pending — so neither
 * is a bare one-click button.
 */
export function WithdrawalActions({
  id,
  amount,
  method,
  destination,
}: {
  id: string;
  amount: number;
  method: string;
  destination: string;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!mode) return;

    startTransition(async () => {
      const result =
        mode === "paid"
          ? await markWithdrawalPaid(id, note)
          : await rejectWithdrawal(id, note);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "paid"
          ? `Marked paid — ₹${amount} debited.`
          : "Request rejected.",
      );
      setMode(null);
      setNote("");
    });
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => setMode("paid")}>
          Mark paid
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMode("rejected")}>
          Reject
        </Button>
      </div>

      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setMode(null);
            setNote("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "paid" ? "Confirm payment" : "Reject this request"}
            </DialogTitle>
            <DialogDescription>
              {mode === "paid" ? (
                <>
                  Only do this once you&rsquo;ve actually sent ₹{amount} to{" "}
                  <span className="font-medium">{destination}</span> via{" "}
                  {method.toUpperCase()}. This debits their balance and
                  can&rsquo;t be undone here.
                </>
              ) : (
                <>
                  Nothing is debited. The user sees your note and their points
                  are released.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="note">
              Note to the user{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder={
                mode === "paid"
                  ? "UTR / reference number"
                  : "Why this was rejected"
              }
              disabled={pending}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => setMode(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              variant={mode === "rejected" ? "destructive" : "default"}
              onClick={confirm}
            >
              {pending
                ? "Saving…"
                : mode === "paid"
                  ? `Confirm ₹${amount} sent`
                  : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
