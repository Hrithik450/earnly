"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FormBuilder } from "@/components/admin/form-builder";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createTask, updateTask } from "@/lib/actions/admin";
import type { Task } from "@/lib/drizzle/schema";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function TaskEditor({ task }: { task?: Task }) {
  const [error, setError] = useState<string | null>(null);
  const [slug, setSlug] = useState(task?.slug ?? "");
  /* Once a task exists its slug is a live URL, so typing in the title stops
     rewriting it. */
  const [slugLocked, setSlugLocked] = useState(Boolean(task));
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = task
        ? await updateTask(task.id, formData)
        : await createTask(formData);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      toast.success(task ? "Task saved." : "Task created.");
      router.push("/admin/tasks");
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
          <CardDescription>
            What the user sees before they start.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              defaultValue={task?.title ?? ""}
              onChange={(e) => {
                if (!slugLocked) setSlug(slugify(e.target.value));
              }}
              placeholder="Follow us on Instagram"
              required
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">URL slug</Label>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugLocked(true);
                setSlug(e.target.value);
              }}
              placeholder="follow-instagram"
              required
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              /dashboard/tasks/{slug || "…"}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="coins">Coins</Label>
              <Input
                id="coins"
                name="coins"
                type="number"
                min={1}
                step={1}
                defaultValue={task?.coins ?? 10}
                required
                disabled={pending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">
                Category{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="category"
                name="category"
                defaultValue={task?.category ?? ""}
                placeholder="Social"
                disabled={pending}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="maxCompletions">Times each user can do this</Label>
            <Input
              id="maxCompletions"
              name="maxCompletions"
              type="number"
              min={1}
              step={1}
              defaultValue={task?.maxCompletions ?? 1}
              placeholder="Leave blank for unlimited"
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              1 means once and it disappears from their board. Higher numbers
              keep it open until they&rsquo;ve used their attempts — each one is
              reviewed separately. Blank means no limit. Rejected attempts
              don&rsquo;t count.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">One-line summary</Label>
            <Input
              id="description"
              name="description"
              defaultValue={task?.description ?? ""}
              placeholder="Shown on the task card"
              disabled={pending}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="externalUrl">
              Task link{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Input
              id="externalUrl"
              name="externalUrl"
              type="url"
              inputMode="url"
              defaultValue={task?.externalUrl ?? ""}
              placeholder="https://instagram.com/yourbrand"
              disabled={pending}
            />
            <p className="text-muted-foreground text-xs">
              Where the user goes to do the task. Shown as a button above the
              form. Leave blank if it&rsquo;s done entirely here.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="instructions">Instructions</Label>
            <Textarea
              id="instructions"
              name="instructions"
              rows={6}
              defaultValue={task?.instructions ?? ""}
              placeholder={"Step by step, one per line.\nLine breaks are preserved."}
              disabled={pending}
            />
          </div>

          <div className="flex items-center gap-2 border-t pt-4">
            <Switch
              id="isActive"
              name="isActive"
              defaultChecked={task?.isActive ?? true}
              disabled={pending}
            />
            <Label htmlFor="isActive" className="font-normal">
              Open for submissions
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submission form</CardTitle>
          <CardDescription>
            What you collect as proof. Answers appear in Submissions the moment
            they&rsquo;re sent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormBuilder initial={task?.formSchema ?? []} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : task ? "Save changes" : "Create task"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/admin/tasks")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
