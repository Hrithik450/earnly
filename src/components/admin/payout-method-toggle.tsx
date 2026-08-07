"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setPayoutMethodEnabled } from "@/lib/actions/admin";
import { PAYOUT_METHOD_COPY, type PayoutMethod } from "@/lib/payout-methods";
import { Switch } from "@/components/ui/switch";

/**
 * The switch itself.
 *
 * Optimism is deliberately avoided here: the server refuses to close the last
 * open method, so the toggle has to reflect what the server decided rather than
 * what was clicked. Flipping it back after a rejection would read as a glitch.
 */
export function PayoutMethodToggle({
  method,
  isEnabled,
  isLast,
}: {
  method: PayoutMethod;
  isEnabled: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const copy = PAYOUT_METHOD_COPY[method];

  return (
    <Switch
      checked={isEnabled}
      disabled={pending || isLast}
      aria-label={`${copy.label} payouts`}
      onCheckedChange={(next) => {
        startTransition(async () => {
          const result = await setPayoutMethodEnabled(method, next);

          if ("error" in result) {
            toast.error(result.error);
            return;
          }

          toast.success(
            next
              ? `${copy.label} is live on the redeem page.`
              : `${copy.label} is off. Users can no longer redeem this way.`,
          );
        });
      }}
    />
  );
}
