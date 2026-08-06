"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { setTaskActive } from "@/lib/actions/admin";
import { Switch } from "@/components/ui/switch";

export function TaskActiveToggle({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Switch
      checked={isActive}
      disabled={pending}
      aria-label={isActive ? "Close task" : "Open task"}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          const result = await setTaskActive(id, checked);
          if ("error" in result) toast.error(result.error);
          else toast.success(checked ? "Task opened." : "Task closed.");
        })
      }
    />
  );
}
