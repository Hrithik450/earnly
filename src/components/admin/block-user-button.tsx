"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setUserBlocked } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function BlockUserButton({
  userId,
  isBlocked,
  self,
}: {
  userId: string;
  isBlocked: boolean;
  self: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (self) {
    return <span className="text-muted-foreground text-xs">You</span>;
  }

  return (
    <Button
      variant={isBlocked ? "outline" : "ghost"}
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await setUserBlocked(userId, !isBlocked);
          if ("error" in result) toast.error(result.error);
          else toast.success(isBlocked ? "User unblocked." : "User blocked.");
        })
      }
    >
      {pending ? "…" : isBlocked ? "Unblock" : "Block"}
    </Button>
  );
}
