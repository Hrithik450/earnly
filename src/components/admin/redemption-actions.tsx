"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  issueRedemption,
  rejectRedemption,
  settleUpiRedemption,
} from "@/lib/actions/admin";
import type { PayoutMethod } from "@/lib/payout-methods";
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

type Mode = "fulfil" | "reject";

/**
 * Two-step confirmation for a redemption decision.
 *
 * Both outcomes are effectively irreversible from the panel — fulfilling debits
 * the coins and publishes the code or reference to the user, and neither status
 * can be set back to pending — so neither is a bare one-click button.
 *
 * A UPI row asks for a transfer reference instead of a card code. The reference
 * is what the user has if they ever need to prove the payment, which is why it
 * is required rather than optional.
 */
export function RedemptionActions({
  id,
  amount,
  brandName,
  method,
  upiId,
}: {
  id: string;
  amount: number;
  brandName: string;
  method: PayoutMethod;
  upiId: string | null;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [payoutRef, setPayoutRef] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const isUpi = method === "upi";

  function close() {
    setMode(null);
    setCode("");
    setPin("");
    setPayoutRef("");
    setNote("");
  }

  function confirm() {
    if (!mode) return;

    startTransition(async () => {
      let result;

      if (mode === "reject") {
        result = await rejectRedemption(id, note);
      } else if (isUpi) {
        const formData = new FormData();
        formData.set("payoutRef", payoutRef);
        formData.set("note", note);
        result = await settleUpiRedemption(id, formData);
      } else {
        const formData = new FormData();
        formData.set("cardCode", code);
        formData.set("cardPin", pin);
        formData.set("note", note);
        result = await issueRedemption(id, formData);
      }

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        mode === "reject"
          ? "Request rejected."
          : isUpi
            ? `Marked sent — ${amount} coins debited.`
            : `Card sent — ${amount} coins debited.`,
      );
      close();
    });
  }

  const fulfilReady = isUpi
    ? payoutRef.trim().length >= 4
    : code.trim().length >= 4;

  return (
    <>
      <div className="flex justify-end gap-2">
        <Button size="sm" onClick={() => setMode("fulfil")}>
          {isUpi ? "Mark sent" : "Send card"}
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
              {mode === "reject"
                ? "Reject this request"
                : isUpi
                  ? `Send ₹${amount} over UPI`
                  : `Send a ₹${amount} ${brandName} card`}
            </DialogTitle>
            <DialogDescription>
              {mode === "reject" ? (
                <>
                  Nothing is debited. The user sees your note and their coins are
                  released.
                </>
              ) : isUpi ? (
                <>
                  Transfer ₹{amount} to{" "}
                  <span className="text-foreground font-medium">{upiId}</span>{" "}
                  first, then paste the reference here. This debits {amount}{" "}
                  coins — it can&rsquo;t be undone.
                </>
              ) : (
                <>
                  Buy the ₹{amount} {brandName} card first, then paste its code
                  here. This debits {amount} coins and shows the code to the
                  user — it can&rsquo;t be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {mode === "fulfil" && isUpi ? (
            <div className="space-y-1.5">
              <Label htmlFor="payoutRef">UPI reference / transaction ID</Label>
              <Input
                id="payoutRef"
                value={payoutRef}
                onChange={(e) => setPayoutRef(e.target.value.slice(0, 120))}
                placeholder="123456789012"
                disabled={pending}
                autoComplete="off"
              />
            </div>
          ) : null}

          {mode === "fulfil" && !isUpi ? (
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
                mode === "reject"
                  ? "Why this was rejected"
                  : isUpi
                    ? "Anything the user should know about the transfer"
                    : "How to redeem it, expiry, anything else"
              }
              disabled={pending}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={close}>
              Cancel
            </Button>
            <Button
              disabled={pending || (mode === "fulfil" && !fulfilReady)}
              variant={mode === "reject" ? "destructive" : "default"}
              onClick={confirm}
            >
              {pending
                ? "Saving…"
                : mode === "reject"
                  ? "Reject request"
                  : isUpi
                    ? `Mark sent, debit ${amount}`
                    : `Send card, debit ${amount}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
