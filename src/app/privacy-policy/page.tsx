import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What Earnly collects, why it is collected, and how to have it deleted.",
};

export default function Page() {
  return (
    <LegalPage title="Privacy Policy" updated="August 2026">
      <p>
        This page describes what Earnly collects and why. It is written to be
        read, not to be survived — if something here is unclear, treat that as
        our mistake and ask.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your name and email address.</strong> The email identifies your
          account and is the only thing we verify, using a 6-digit code.
        </li>
        <li>
          <strong>Your mobile number.</strong> Collected so withdrawals have
          somewhere to go. We never send it an OTP and you cannot sign in with it
          alone.
        </li>
        <li>
          <strong>Your payout details</strong> — the UPI ID or Paytm number you
          add, used solely to pay you.
        </li>
        <li>
          <strong>What you submit to tasks.</strong> Whatever the task form asks
          for, kept as the record of why points were awarded.
        </li>
      </ul>

      <h2>What we do not collect</h2>
      <p>
        No contacts, no location, no device identifiers, and no advertising
        trackers. We do not store your password — only a hash of it, which
        cannot be reversed back into the original.
      </p>

      <h2>Who can see it</h2>
      <p>
        Our administrators can see your profile, your submissions and your
        withdrawal requests, because a person reviews and pays each withdrawal by
        hand. We do not sell your data and we do not share it with advertisers.
        We disclose it only where the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Submissions and payout records are kept as long as your account exists,
        because they are the evidence behind money already paid. Ask us to delete
        your account and we remove your profile and payout details; anonymised
        payout records may be retained where accounting rules require it.
      </p>

      <h2>Your choices</h2>
      <p>
        You can correct your details from your profile at any time, request a
        copy of your data, or ask for your account to be deleted. Deleting your
        account forfeits any unwithdrawn balance, so withdraw first.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that affects you, we will say so on this
        page and update the date above rather than change it quietly.
      </p>
    </LegalPage>
  );
}
