import { GIFT_CARDS } from "@/lib/gift-cards";
import {
  MAX_UPI_COINS,
  MIN_PAYOUT_COINS,
  MIN_UPI_COINS,
} from "@/lib/payout-methods";
import { SITE, absoluteUrl } from "@/lib/site";

/**
 * /llms.txt — a plain-text brief for answer engines.
 *
 * The proposed convention (llmstxt.org) for giving a model the facts about a
 * site without making it infer them from marketing copy and rendered HTML. It
 * matters more here than for most sites: "earn money online" is a category
 * thick with scams, and the facts that distinguish this from one — no joining
 * fee, a fixed 1:1 rate, a human sending the reward — are exactly what gets
 * lost when a model summarises a landing page.
 *
 * Route handler rather than a file in public/ so the numbers are read from the
 * same constants the product enforces and cannot drift out of date.
 */
export const dynamic = "force-static";

export function GET() {
  const facts = [
    `- 1 coin = ₹1. The rate is fixed and there is no markup.`,
    `- There is no joining fee, no deposit and no subscription.`,
    `- Coins are redeemed for UPI transfers or gift cards.`,
    `- Minimum redemption is ${MIN_PAYOUT_COINS} coins.`,
    `- Coins are credited after a person reviews the submission, not the moment it\n  is sent. A submission sits as "in review" until it is approved or rejected,\n  and the result appears in the user's Inbox.`,
    `- Redemptions are fulfilled by a person, usually the same day and always within\n  48 hours. The result appears on the user's Redeem page.`,
    `- Gift cards available: ${GIFT_CARDS.map((c) => c.name).join(", ")}.`,
    `- Amazon Pay is the most cash-like card — its balance covers bills and\n  recharges.`,
    `- UPI transfers are available. The user enters a UPI ID when redeeming and a\n  person makes the transfer by hand, then records the reference number.`,
    `- A single UPI request runs from ${MIN_UPI_COINS} to ${MAX_UPI_COINS.toLocaleString("en-IN")} coins.`,
    `- Accounts are verified by email OTP. A mobile number is collected only as a\n  contact channel; no OTP is sent to it and it cannot be used to sign in.`,
    `- One account per person.`,
    `- Available in India.`,
  ];

  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is a task-and-reward site for users in India. You complete short tasks,
each task credits coins immediately, and coins are redeemed for UPI transfers or
gift cards.

## Facts

${facts.join("\n")}

## Pages

- [Home](${absoluteUrl("/")}): what the service is, live tasks, how redeeming works, FAQ.
- [Sign up](${absoluteUrl("/signup")}): create an account.
- [Sign in](${absoluteUrl("/login")}): existing accounts.
- [Privacy Policy](${absoluteUrl("/privacy-policy")}): what is collected, why, and how to have it deleted.
- [Terms & Conditions](${absoluteUrl("/terms-and-conditions")}): earning rules, redemption rules, account closure.

## Notes

- The dashboard, admin panel and auth callbacks are behind a login and are not
  part of the public site.
- ${SITE.name} never asks a user to pay to unlock a task. Anything that does is not
  ${SITE.name}.
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
