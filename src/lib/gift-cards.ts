/**
 * The gift card catalogue — the only thing coins can be spent on.
 *
 * Earnly holds no float and moves no money to users. A coin is a claim on a
 * voucher we buy from a brand, so the catalogue is a static list in code rather
 * than a table: an admin fulfilling a redemption pastes in a code they bought,
 * and nothing about the offer needs to be editable at runtime. Adding a brand is
 * a deploy, which is the right friction for a decision that changes what we owe.
 *
 * 1 coin = ₹1 of face value, everywhere. There is no spread, no per-brand rate
 * and no fee, so a user never has to work out what their balance is "really"
 * worth — the number on the card is the number of coins it costs.
 */

export type GiftCardBrand = {
  id: string;
  name: string;
  /** Sits under the name on the card; says what the voucher actually buys. */
  blurb: string;
  /** Face values we stock, ascending. Coin cost equals the value. */
  denominations: number[];
  /** Card accent, matching the palette in globals.css. */
  accent: string;
  /**
   * True when the balance can be spent on essentials — bills, recharges,
   * groceries — rather than only on one shop's catalogue. Surfaced in the UI
   * because it is the difference most people actually care about.
   */
  spendableLikeCash: boolean;
  /** How the code reaches the user, in the user's words. */
  delivery: string;
};

/**
 * Five brands, deliberately. Each is (a) widely recognised in India, (b) sold to
 * us at little or no markup, and (c) usable without a niche account. They are
 * ordered by how close the balance is to cash, because that is the order people
 * choose in.
 */
export const GIFT_CARDS: GiftCardBrand[] = [
  {
    id: "amazon-pay",
    name: "Amazon Pay",
    blurb:
      "The closest thing to cash on this list. Spend it on anything Amazon sells, or use the balance for electricity bills, mobile recharges and UPI payments.",
    denominations: [100, 250, 500, 1000],
    accent: "var(--yellow)",
    spendableLikeCash: true,
    delivery: "A 14-character code you add to your Amazon Pay balance.",
  },
  {
    id: "flipkart",
    name: "Flipkart",
    blurb:
      "Works across the whole Flipkart catalogue — phones, groceries, clothes — and stacks with sale prices instead of cancelling them out.",
    denominations: [100, 250, 500, 1000],
    accent: "var(--blue)",
    spendableLikeCash: false,
    delivery: "A gift card number and PIN you add at checkout.",
  },
  {
    id: "google-play",
    name: "Google Play",
    blurb:
      "Apps, games, in-app purchases and subscriptions. The usual pick if your balance is going on a game or a UPI-less phone.",
    denominations: [100, 250, 500],
    accent: "var(--green)",
    spendableLikeCash: false,
    delivery: "A redeem code you enter in the Play Store.",
  },
  {
    id: "swiggy",
    name: "Swiggy Money",
    blurb:
      "Food delivery and Instamart groceries. Loads straight into Swiggy Money and applies before you pay.",
    denominations: [100, 250, 500],
    accent: "var(--red)",
    spendableLikeCash: false,
    delivery: "A code you redeem under Swiggy Money in the app.",
  },
  {
    id: "myntra",
    name: "Myntra",
    blurb:
      "Clothes, shoes and beauty. Sits in your Myntra wallet and can be split across more than one order.",
    denominations: [250, 500, 1000],
    accent: "var(--sky)",
    spendableLikeCash: false,
    delivery: "A gift card code and PIN for your Myntra wallet.",
  },
];

const BY_ID = new Map(GIFT_CARDS.map((card) => [card.id, card]));

export function getGiftCard(id: string): GiftCardBrand | undefined {
  return BY_ID.get(id);
}

/**
 * Whether a brand is stocked in this denomination.
 *
 * The value posted by the redeem form decides how many coins get debited, so it
 * is never trusted — it has to match an entry in this file or the request is
 * rejected.
 */
export function isValidDenomination(brandId: string, value: number): boolean {
  return BY_ID.get(brandId)?.denominations.includes(value) ?? false;
}

/**
 * The cheapest card we stock, and therefore the balance at which the redeem page
 * becomes useful. Derived rather than written down, so removing a low
 * denomination cannot leave the UI advertising a threshold nothing can buy.
 */
export const MIN_REDEEM_COINS = Math.min(
  ...GIFT_CARDS.flatMap((card) => card.denominations),
);
