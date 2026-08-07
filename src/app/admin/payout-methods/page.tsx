import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { GIFT_CARDS } from "@/lib/gift-cards";
import {
  MAX_UPI_COINS,
  MIN_UPI_COINS,
  PAYOUT_METHOD_COPY,
  PAYOUT_METHODS,
} from "@/lib/payout-methods";
import {
  getEnabledGiftCardBrands,
  getEnabledPayoutMethods,
} from "@/lib/queries";
import { GiftCardBrandToggle } from "@/components/admin/gift-card-brand-toggle";
import { PayoutMethodToggle } from "@/components/admin/payout-method-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Payout methods" };
export const dynamic = "force-dynamic";

/**
 * Which ways users may redeem, and which cards are on sale.
 *
 * Scope is the redeem page only. The landing page and the policy pages name
 * both methods in static copy — at scale the offer narrows to gift cards and
 * that copy gets rewritten then.
 */
export default async function AdminPayoutMethodsPage() {
  await requireAdmin();

  const [enabled, enabledBrands] = await Promise.all([
    getEnabledPayoutMethods(),
    getEnabledGiftCardBrands(),
  ]);

  const openBrands = new Set(enabledBrands.map((b) => b.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Payout methods
        </h1>
        <p className="text-muted-foreground text-sm">
          What users can turn coins into. Switching one off removes it from the
          redeem page — the landing page copy is separate and stays as it is.
        </p>
      </div>

      <div className="grid gap-4">
        {PAYOUT_METHODS.map((method) => {
          const copy = PAYOUT_METHOD_COPY[method];
          const isEnabled = enabled.includes(method);
          /* The server refuses to close the last open method — disabling the
             switch says so before the click rather than after. */
          const isLast = isEnabled && enabled.length === 1;

          return (
            <Card key={method}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-base">{copy.label}</CardTitle>
                  <p className="text-muted-foreground text-sm">{copy.blurb}</p>
                </div>
                <PayoutMethodToggle
                  method={method}
                  isEnabled={isEnabled}
                  isLast={isLast}
                />
              </CardHeader>

              <CardContent className="text-muted-foreground space-y-2 text-sm">
                {method === "upi" ? (
                  <>
                    <p>
                      Requests between ₹{MIN_UPI_COINS} and ₹
                      {MAX_UPI_COINS.toLocaleString("en-IN")}. You make the
                      transfer by hand, then paste the reference back in — the
                      coins are debited at that point, not when it is requested.
                    </p>
                    <p>
                      Intended as a temporary option. The site is built around
                      gift cards, and the policy pages describe both for now.
                    </p>
                  </>
                ) : (
                  <>
                    <p>
                      Brands and denominations live in code
                      (`src/lib/gift-cards.ts`). Adding one is a deploy — these
                      switches only control which of them are on sale.
                    </p>

                    <div className="divide-y rounded-lg border">
                      {GIFT_CARDS.map((card) => {
                        const brandOpen = openBrands.has(card.id);
                        const lastBrand = brandOpen && openBrands.size === 1;

                        return (
                          <div
                            key={card.id}
                            className="flex items-center justify-between gap-4 px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="text-foreground text-sm font-medium">
                                {card.name}
                              </p>
                              <p className="text-xs">
                                ₹
                                {card.denominations
                                  .map((d) => d.toLocaleString("en-IN"))
                                  .join(" · ₹")}
                              </p>
                            </div>
                            <GiftCardBrandToggle
                              brandId={card.id}
                              brandName={card.name}
                              isEnabled={brandOpen}
                              isLast={lastBrand}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-xs">
                      Switching a card off hides it on the redeem page. The
                      landing page lists the full catalogue either way.
                    </p>
                  </>
                )}

                {isLast ? (
                  <p className="font-medium text-amber-600 dark:text-amber-500">
                    This is the only way left to redeem, so it can&rsquo;t be
                    switched off. Turn the other method on first.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
