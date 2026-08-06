import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  /* Without an email there is nothing to verify against — the OTP is scoped to
     an address, so send them back to sign up rather than render a dead form. */
  if (!email) redirect("/signup");

  return <VerifyForm email={email} />;
}
