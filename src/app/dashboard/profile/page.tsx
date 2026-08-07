import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/guards";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl">Profile</h1>
        <p className="caption mt-1.5 text-sm">
          Your account details. Gift cards are delivered here, not to a bank.
        </p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
