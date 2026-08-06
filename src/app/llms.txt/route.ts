import { MIN_WITHDRAWAL_POINTS } from "@/lib/validations";
import { SITE, absoluteUrl } from "@/lib/site";

/**
 * /llms.txt — a plain-text brief for answer engines.
 *
 * The proposed convention (llmstxt.org) for giving a model the facts about a
 * site without making it infer them from marketing copy and rendered HTML. It
 * matters more here than for most sites: "earn money online" is a category
 * thick with scams, and the facts that distinguish this from one — no joining
 * fee, a fixed 1:1 rate, a human paying out — are exactly what gets lost when a
 * model summarises a landing page.
 *
 * Route handler rather than a file in public/ so the numbers are read from the
 * same constants the product enforces and cannot drift out of date.
 */
export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE.name}

> ${SITE.description}

${SITE.name} is a task-and-reward site for users in India. You complete short tasks,
each task credits points immediately, and points are withdrawn as rupees to a UPI
ID or a Paytm number.

## Facts

- 1 point = ₹1. The rate is fixed; points are not a separate currency with a
  floating conversion.
- There is no joining fee, no deposit, no subscription and no payout fee.
- Minimum withdrawal is ${MIN_WITHDRAWAL_POINTS} points (₹${MIN_WITHDRAWAL_POINTS}).
- Points credit the moment a task is submitted. There is no approval queue for
  earning.
- Withdrawals are reviewed and paid by a person, usually the same day and always
  within 48 hours.
- Payout methods: UPI (any handle — GPay, PhonePe, Paytm, a bank's own) and Paytm
  wallet.
- Accounts are verified by email OTP. A mobile number is collected only as a
  payout destination; no OTP is sent to it and it cannot be used to sign in.
- One account per person.
- Available in India.

## Pages

- [Home](${absoluteUrl("/")}): what the service is, live tasks, payout methods, FAQ.
- [Sign up](${absoluteUrl("/signup")}): create an account.
- [Sign in](${absoluteUrl("/login")}): existing accounts.
- [Privacy Policy](${absoluteUrl("/privacy-policy")}): what is collected, why, and how to have it deleted.
- [Terms & Conditions](${absoluteUrl("/terms-and-conditions")}): earning rules, withdrawal rules, account closure.

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
