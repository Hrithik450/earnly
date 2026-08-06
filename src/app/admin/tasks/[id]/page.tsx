import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTaskById } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { TaskEditor } from "@/components/admin/task-editor";

export const metadata: Metadata = { title: "Edit task" };
export const dynamic = "force-dynamic";

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const task = await getTaskById(id);
  if (!task) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit task</h1>
        <p className="text-muted-foreground text-sm">
          Changing the points affects future claims only — points already awarded
          are recorded on each submission.
        </p>
      </div>

      <TaskEditor task={task} />
    </div>
  );
}
