"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { issueRedemption, rejectRedemption } from "@/lib/actions/admin";
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

type Mode = "issue" | "reject";

/**
 * Two-step confirmation for a redemption decision.
 *
 * Both outcomes are effectively irreversible from the panel — issuing debits
 * the coins and publishes the code to the user, and neither status can be set
 * back to pending — so neither is a bare one-click button.
 */
export function RedemptionActions({
  id,
  amount,
  brandName,
}: {
  id: string;
  amount: number;
  brandName: string;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  function close() {
    setMode(null);
    setCode("");
    setPin("");
    setNote("");
  }

  function confirm() {
    if (!mode) return;

    startTransition(async () => {
      let result;

      if (mode === "issue") {
        const formData = new FormData();
        formData.set("cardCode", code);
        formData.set("cardPin", pin);
        formData.set("note", note);
        result = await issueRedemption(id, formData);
      } else {
        result = await rejectRedemption(id, note);
      }

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "issue"
          ? `Card sent — ${amount} coins debited.`
          : "Request rejected.",
      );
      close();
    });
  }

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => setMode("issue")}>
          Send card
        </Button>
        <Button size="sm" variant="outline" onClick={() => setMode("reject")}>
          Reject
        </Button>
      </div>

      <Dialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open && !pending) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === "issue"
                ? `Send a ₹${amount} ${brandName} card`
                : "Reject this request"}
            </DialogTitle>
            <DialogDescription>
              {mode === "issue" ? (
                <>
                  Buy the ₹{amount} {brandName} card first, then paste its code
                  here. This debits {amount} coins and shows the code to the
                  user — it can&rsquo;t be undone.
                </>
              ) : (
                <>
                  Nothing is debited. The user sees your note and their coins are
                  released.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {mode === "issue" ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="cardCode">Gift card code</Label>
                <Input
                  id="cardCode"
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 120))}
                  placeholder="XXXX-XXXXXX-XXXX"
                  disabled={pending}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cardPin">
                  PIN{" "}
                  <span className="text-muted-foreground font-normal">
                    (if the brand issues one)
                  </span>
                </Label>
                <Input
                  id="cardPin"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.slice(0, 60))}
                  disabled={pending}
                  autoComplete="off"
                />
              </div>
            </div>
          ) : null}

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
                mode === "issue"
                  ? "How to redeem it, expiry, anything else"
                  : "Why this was rejected"
              }
              disabled={pending}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={pending || (mode === "issue" && code.trim().length < 4)}
              variant={mode === "reject" ? "destructive" : "default"}
              onClick={confirm}
            >
              {pending
                ? "Saving…"
                : mode === "issue"
                  ? `Send card, debit ${amount}`
                  : "Reject request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
