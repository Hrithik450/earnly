/**
 * The ways coins can leave a balance.
 *
 * Gift cards are the long-term model — see the note in gift-cards.ts. UPI is a
 * temporary second option, which is why it is a row in `payout_methods` that an
 * admin can switch off rather than a code change.
 *
 * Scope is the redeem flow: this decides what a request may be filed as, and
 * what the admin panel shows. The public landing copy names both methods
 * statically and is rewritten by hand when the offer changes.
 *
 * The catalogue of *brands* stays in code. This file is only about which kinds
 * of payout exist, because that is the part the admin panel controls.
 */

import { MIN_REDEEM_COINS } from "@/lib/gift-cards";

export const PAYOUT_METHODS = ["gift_card", "upi"] as const;

export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export function isPayoutMethod(value: unknown): value is PayoutMethod {
  return (
    typeof value === "string" &&
    (PAYOUT_METHODS as readonly string[]).includes(value)
  );
}

/** Copy for each method, shared by the redeem form and the admin panel. */
export const PAYOUT_METHOD_COPY: Record<
  PayoutMethod,
  {
    /** Used in headings and buttons. */
    label: string;
    /** Sentence describing what the user gets. */
    blurb: string;
    /** How the reward reaches them, in the user's words. */
    delivery: string;
    /** Phrase for the thing coins turn into, e.g. "gift cards". */
    noun: string;
  }
> = {
  gift_card: {
    label: "Gift card",
    blurb:
      "Pick a brand and an amount. A real person buys the card and the code lands on your Redeem page.",
    delivery: "A code you add to the brand's app or website.",
    noun: "gift cards",
  },
  upi: {
    label: "UPI",
    blurb:
      "Send your coins straight to any UPI ID. Enter the ID once when you request, and the transfer follows.",
    delivery: "A transfer to the UPI ID you enter, with its reference number.",
    noun: "UPI transfers",
  },
};

/**
 * The smallest request we accept over UPI.
 *
 * Matched to the cheapest gift card so the two methods unlock at the same
 * balance — a user who can afford one should never be told they cannot afford
 * the other, which reads as a bug rather than a rule.
 */
export const MIN_UPI_COINS = 100;

/** Largest single UPI request. A ceiling on the damage one bad row can do. */
export const MAX_UPI_COINS = 10000;

/**
 * Joins the enabled methods into a phrase for the redeem page — "gift cards",
 * "UPI transfers", or "gift cards or UPI transfers".
 */
export function payoutNoun(enabled: PayoutMethod[]): string {
  const nouns = enabled.map((m) => PAYOUT_METHOD_COPY[m].noun);
  if (nouns.length === 0) return "rewards";
  if (nouns.length === 1) return nouns[0];
  return `${nouns.slice(0, -1).join(", ")} or ${nouns[nouns.length - 1]}`;
}

/**
 * The lowest balance any open method will accept.
 *
 * Read from the gift card catalogue rather than written down, so the redeem
 * page cannot advertise a threshold its own form disagrees with — and it moves
 * on its own when a method is switched off.
 */
export function minRedeemCoins(enabled: PayoutMethod[]): number {
  const floors = enabled.map((m) =>
    m === "gift_card" ? MIN_REDEEM_COINS : MIN_UPI_COINS,
  );
  return floors.length ? Math.min(...floors) : MIN_REDEEM_COINS;
}

/**
 * The `payout_methods` row id for a single gift card brand.
 *
 * Brands share that table with the methods rather than having their own,
 * because both answer "may this be redeemed right now" and the redeem page asks
 * that once. The prefix is what keeps the two kinds of row apart.
 */
export function giftCardBrandKey(brandId: string): string {
  return `gift_card:${brandId}`;
}
