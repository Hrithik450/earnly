"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteTask } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Deletes a task, behind a confirmation.
 *
 * Sits next to Edit in a table row, which is the most dangerous place a
 * destructive button can be — one row off and the wrong task is gone. So the
 * dialog names the task and states what goes with it, and once submissions
 * exist the title has to be typed out: a task with history should be closed,
 * not deleted, and the friction is there to make choosing this deliberate.
 */
export function TaskDeleteButton({
  id,
  title,
  submissionCount,
}: {
  id: string;
  title: string;
  submissionCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, startTransition] = useTransition();

  const hasHistory = submissionCount > 0;
  const confirmed = !hasHistory || typed.trim() === title;

  function close() {
    setOpen(false);
    setTyped("");
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !pending) close();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{title}”?</DialogTitle>
            <DialogDescription>
              {hasHistory ? (
                <>
                  This also deletes{" "}
                  <span className="text-foreground font-medium">
                    {submissionCount} submission
                    {submissionCount === 1 ? "" : "s"}
                  </span>
                  . Coins already paid stay paid and the earnings history is
                  untouched, but the proof of what was submitted is gone for
                  good. Closing the task keeps all of it.
                </>
              ) : (
                <>
                  Nothing has been submitted to this task, so nothing else goes
                  with it. This can&rsquo;t be undone.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {hasHistory ? (
            <div className="space-y-1.5">
              <label htmlFor="confirm-title" className="text-sm font-medium">
                Type the task title to confirm
              </label>
              <input
                id="confirm-title"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={pending}
                autoComplete="off"
                placeholder={title}
                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={close}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending || !confirmed}
              onClick={() => {
                startTransition(async () => {
                  const result = await deleteTask(id);

                  if ("error" in result) {
                    toast.error(result.error);
                    return;
                  }

                  toast.success(`“${title}” deleted.`);
                  close();
                });
              }}
            >
              {pending ? "Deleting…" : "Delete task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
