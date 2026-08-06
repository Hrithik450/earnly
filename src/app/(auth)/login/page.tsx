import type { Metadata } from "next";
import { InkError } from "@/components/paper/form";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  /* Reject absolute and protocol-relative targets here as well as in the action
     — this value is echoed into a hidden input, so it must be clean going in. */
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  return (
    <div className="space-y-4">
      {error === "link_expired" ? (
        <InkError>That link has expired. Sign in to continue.</InkError>
      ) : null}
      <LoginForm next={safeNext} />
    </div>
  );
}
