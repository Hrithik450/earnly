import type { Metadata } from "next";
import Link from "next/link";
import { getAllTasks, getSubmissionCounts } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/auth/guards";
import { TaskActiveToggle } from "@/components/admin/task-active-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminTasksPage() {
  await requireAdmin();

  const [all, counts] = await Promise.all([
    getAllTasks(),
    getSubmissionCounts(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground text-sm">
            {all.length} total · {all.filter((t) => t.isActive).length} open
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/tasks/new">New task</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {all.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              No tasks yet. Create one to put it on the board.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead className="text-right">Points</TableHead>
                  <TableHead className="text-right">Fields</TableHead>
                  <TableHead className="text-right">Submissions</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>
                      <Link
                        href={`/admin/tasks/${task.id}`}
                        className="font-medium hover:underline"
                      >
                        {task.title}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {task.category ? `${task.category} · ` : ""}
                        {task.slug}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {task.points}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {task.formSchema.length}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {counts.get(task.id) ?? 0}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {DATE.format(task.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <TaskActiveToggle id={task.id} isActive={task.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/tasks/${task.id}`}>Edit</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
