"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setGiftCardBrandEnabled } from "@/lib/actions/admin";
import { Switch } from "@/components/ui/switch";

/**
 * On-sale switch for one gift card brand.
 *
 * Not optimistic, for the same reason as the method toggle: the server refuses
 * to close the last brand on sale, so the switch has to show what the server
 * decided rather than what was clicked.
 */
export function GiftCardBrandToggle({
  brandId,
  brandName,
  isEnabled,
  isLast,
}: {
  brandId: string;
  brandName: string;
  isEnabled: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={isEnabled}
      disabled={pending || isLast}
      aria-label={`${brandName} cards`}
      onCheckedChange={(next) => {
        startTransition(async () => {
          const result = await setGiftCardBrandEnabled(brandId, next);

          if ("error" in result) {
            toast.error(result.error);
            return;
          }

          toast.success(
            next
              ? `${brandName} is back on the redeem page.`
              : `${brandName} is off. Users can no longer pick it.`,
          );
        });
      }}
    />
  );
}
