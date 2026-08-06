import { MIN_WITHDRAWAL_POINTS } from "@/lib/validations";
import { Rise } from "./motion";

const FAQS = [
  {
    q: "Does it cost anything to join?",
    a: "No. There is no joining fee, no deposit and no subscription. If anything ever asks you to pay to unlock tasks, it is not us.",
  },
  {
    q: "How much is a point worth?",
    a: "Exactly ₹1. Points are not a separate currency with its own rate — the number on your balance is the number of rupees you can withdraw.",
  },
  {
    q: "When do points appear?",
    a: "The moment you submit the task form. There is no approval queue for earning; the only manual step is the payout itself.",
  },
  {
    q: "How long do withdrawals take?",
    a: `You can request a withdrawal from ${MIN_WITHDRAWAL_POINTS} points. Each one is paid by hand to your UPI ID or Paytm number, usually the same day and always within 48 hours.`,
  },
  {
    q: "Why do you need my mobile number?",
    a: "Only so withdrawals have somewhere to go. We send no OTP to it and you never sign in with it — your email is what verifies your account.",
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
