import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/guards";
import { TaskEditor } from "@/components/admin/task-editor";

export const metadata: Metadata = { title: "New task" };

export default async function NewTaskPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New task</h1>
        <p className="text-muted-foreground text-sm">
          Define the reward and the form users fill in to claim it.
        </p>
      </div>

      <TaskEditor />
    </div>
  );
}
