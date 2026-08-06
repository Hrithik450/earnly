import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { MIN_WITHDRAWAL_POINTS } from "@/lib/validations";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The rules for earning points on Earnly and withdrawing them to UPI or Paytm.",
};

export default function Page() {
  return (
    <LegalPage title="Terms & Conditions" updated="August 2026">
      <p>
        By creating an account you agree to what follows. These terms are short
        on purpose.
      </p>

      <h2>Your account</h2>
      <p>
        One account per person. Your details must be accurate — payouts go to the
        number and UPI ID you provide, and we cannot recover money sent to
        details you entered incorrectly. Keep your password to yourself; activity
        under your account is treated as yours.
      </p>

      <h2>Points</h2>
      <p>
        One point is worth ₹1. Points are credited the moment you submit a task
        form, and are not a separate currency with a floating rate. They have no
        value outside Earnly, cannot be transferred between accounts, and expire
        only if your account is closed.
      </p>

      <h2>Withdrawals</h2>
      <p>
        You can request a withdrawal once your balance reaches{" "}
        {MIN_WITHDRAWAL_POINTS} points. Every request is reviewed and paid by a
        person, usually the same day and always within 48 hours. Points leave
        your balance when a payout is marked paid — not when you request it — so
        a rejected request costs you nothing. We charge no fee at either end.
      </p>

      <h2>Fair use</h2>
      <p>
        Tasks must be genuinely completed. Submitting false proof, automating
        submissions, or running multiple accounts to claim the same reward will
        cost you the points involved and may close your account. Most tasks are
        one per account; the task page tells you before you start.
      </p>

      <h2>Availability</h2>
      <p>
        Tasks come and go, and a task that closes cannot be started — but points
        already earned from it stay yours. We may change what is on offer without
        notice. We do not guarantee uninterrupted access.
      </p>

      <h2>Ending things</h2>
      <p>
        You can stop using Earnly at any time; withdraw your balance first, as
        closing an account forfeits what is left in it. We may suspend an account
        that breaks these terms, and will say why.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change materially we will update this page and the date
        above. Continuing to use Earnly after that means you accept the revision.
      </p>
    </LegalPage>
  );
}
