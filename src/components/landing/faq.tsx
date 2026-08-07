import {
  MAX_UPI_COINS,
  MIN_PAYOUT_COINS,
  MIN_UPI_COINS,
} from "@/lib/payout-methods";
import { Rise } from "./motion";

const FAQS = [
  {
    q: "Does it cost anything to join?",
    a: "No. There is no joining fee, no deposit and no subscription. If anything ever asks you to pay to unlock tasks, it is not us.",
  },
  {
    q: "How much is a coin worth?",
    a: "Exactly ₹1. A ₹500 transfer or a ₹500 card costs 500 coins — we add no markup and take no cut on top.",
  },
  {
    q: "When do coins appear?",
    a: "After we check your submission. It sits in your inbox as in review, and once it's approved the coins land in your balance — usually the same day. If something's wrong we tell you why so you can fix it and send it again.",
  },
  {
    q: "Can I get cash instead of a gift card?",
    a: "Yes — pick UPI when you redeem and enter your UPI ID. A person makes the transfer by hand and its reference number appears on your Redeem page.",
  },
  {
    q: "How does the UPI option work?",
    a: `Enter your UPI ID and an amount when you redeem. Requests run from ${MIN_UPI_COINS} up to ${MAX_UPI_COINS.toLocaleString("en-IN")} coins — check the ID carefully, because a transfer to the wrong one can't be pulled back.`,
  },
  {
    q: "Which gift cards can I get?",
    a: "Amazon Pay, Flipkart, Google Play, Swiggy Money and Myntra. Amazon Pay is the most flexible — the balance works for bills and recharges, not just shopping.",
  },
  {
    q: "How long does redeeming take?",
    a: `You can redeem from ${MIN_PAYOUT_COINS} coins. Every request is handled by a person and the result appears on your Redeem page, usually the same day and always within 48 hours.`,
  },
  {
    q: "Why do you need my mobile number?",
    a: "Only so we can reach you about a redemption. We send no OTP to it and you never sign in with it — your email is what verifies your account.",
  },
  {
    q: "Can I do the same task twice?",
    a: "Depends on the task — each one says how many times you can do it, and some can be done more than once. Every submission is reviewed on its own.",
  },
];

/**
 * Built on <details>/<summary> so the accordion opens with no client JS — the
 * landing page ships no interactive bundle for this section.
 */
export function Faq() {
  return (
    <section id="faq" className="px-6 py-20 sm:py-28">
      {/* The same Q&A pairs as structured data. Google only shows FAQ rich
          results when the answers are visibly on the page too, which they are —
          this is a machine-readable mirror of what is rendered below, not extra
          content. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((item) => ({
              "@type": "Question",
              name: item.q,
              acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
          }),
        }}
      />

      <div className="mx-auto max-w-3xl">
        <Rise>
          <div className="text-center">
            <span
              className="sticker mb-4 inline-block rotate-[2deg] shadow-[-2px_2px_0_0_var(--ink)]"
              style={{ backgroundColor: "var(--sky)" }}
            >
              Questions
            </span>
            <h2 className="text-[clamp(1.9rem,4vw,2.9rem)]">
              The things people ask first.
            </h2>
          </div>
        </Rise>

        <div className="mt-12 space-y-4">
          {FAQS.map((item, i) => (
            <Rise key={item.q} delay={i * 0.05}>
              <details className="faq-item">
                <summary>
                  <span className="text-base font-bold sm:text-lg">
                    {item.q}
                  </span>
                  <span className="faq-toggle" aria-hidden />
                </summary>
                <p className="caption px-5 pb-5 text-sm leading-relaxed">
                  {item.a}
                </p>
              </details>
            </Rise>
          ))}
        </div>
      </div>
    </section>
  );
}
