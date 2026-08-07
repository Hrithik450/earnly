import { MIN_REDEEM_COINS } from "@/lib/gift-cards";
import { Rise } from "./motion";

const FAQS = [
  {
    q: "Does it cost anything to join?",
    a: "No. There is no joining fee, no deposit and no subscription. If anything ever asks you to pay to unlock tasks, it is not us.",
  },
  {
    q: "How much is a coin worth?",
    a: "Exactly ₹1 of gift card value. A ₹500 card costs 500 coins — we add no markup and take no cut on top.",
  },
  {
    q: "When do coins appear?",
    a: "The moment you submit the task form. There is no approval queue for earning; the only manual step is buying your card.",
  },
  {
    q: "Which gift cards can I get?",
    a: "Amazon Pay, Flipkart, Google Play, Swiggy Money and Myntra. Amazon Pay is the most flexible — the balance works for bills, recharges and UPI payments, not just shopping.",
  },
  {
    q: "How long does redeeming take?",
    a: `You can redeem from ${MIN_REDEEM_COINS} coins. Each card is bought by hand and the code appears on your Redeem page, usually the same day and always within 48 hours.`,
  },
  {
    q: "Can I get cash instead?",
    a: "No — we don't move money, we only send gift cards. If you want something close to cash, pick Amazon Pay: its balance covers bills, recharges and UPI payments.",
  },
  {
    q: "Why do you need my mobile number?",
    a: "Only so we can reach you about a redemption. We send no OTP to it and you never sign in with it — your email is what verifies your account.",
  },
  {
    q: "Can I do the same task twice?",
    a: "Most tasks are one per account. The task page tells you before you start, and a second submission on a one-off task is rejected rather than paid.",
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
          content. Built from the same FAQS array so the two cannot diverge. */}
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
