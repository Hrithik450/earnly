import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";
import { MIN_REDEEM_COINS } from "@/lib/gift-cards";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The rules for earning coins on Earnly and redeeming them for gift cards.",
  alternates: { canonical: "/terms-and-conditions" },
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
        One account per person. Your details must be accurate — a gift card is
        delivered to the account you signed up with. Keep your password to
        yourself; activity under your account is treated as yours.
      </p>

      <h2>Coins</h2>
      <p>
        One coin is worth ₹1 of gift card value. Coins are credited the moment
        you submit a task form. They are not money, have no cash value, cannot
        be transferred between accounts or exchanged for cash, and expire only
        if your account is closed.
      </p>

      <h2>Redeeming</h2>
      <p>
        You can redeem once your balance reaches {MIN_REDEEM_COINS} coins.
        Choose a brand and an amount, and we buy the card and post its code to
        your Redeem page — usually the same day and always within 48 hours.
        Coins leave your balance when the card is issued, not when you request
        it, so a rejected request costs you nothing. We add no markup.
      </p>
      <p>
        A gift card code is yours the moment it is shown to you and cannot be
        replaced, so treat it like cash and do not share it. Each card is
        governed by the issuing brand&rsquo;s own terms; we are not the issuer
        and are not responsible for a brand changing or withdrawing its
        programme. Availability of any brand may change without notice.
      </p>

      <h2>Fair use</h2>
      <p>
        Tasks must be genuinely completed. Submitting false proof, automating
        submissions, or running multiple accounts to claim the same reward will
        cost you the coins involved and may close your account. Most tasks are
        one per account; the task page tells you before you start.
      </p>

      <h2>Availability</h2>
      <p>
        Tasks come and go, and a task that closes cannot be started — but coins
        already earned from it stay yours. We may change what is on offer
        without notice. We do not guarantee uninterrupted access.
      </p>

      <h2>Ending things</h2>
      <p>
        You can stop using Earnly at any time; redeem your balance first, as
        closing an account forfeits what is left in it. We may suspend an
        account that breaks these terms, and will say why.
      </p>

      <h2>Changes</h2>
      <p>
        If these terms change materially we will update this page and the date
        above. Continuing to use Earnly after that means you accept the revision.
      </p>
    </LegalPage>
  );
}
