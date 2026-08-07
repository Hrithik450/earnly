"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  resetSubmissionCount,
  setAutoLimit,
  setMaintenanceMode,
} from "@/lib/actions/maintenance";
import { Switch } from "@/components/ui/switch";

/**
 * The two switches.
 *
 * Neither is optimistic. Both write a platform-wide flag, and a switch that
 * animates into position before the server has agreed would be showing an admin
 * a state the users are not in — which on this page is the one thing that must
 * never happen.
 */

export function MaintenanceToggle({ isOn }: { isOn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isOn ? "Platform is in maintenance" : "Platform is live"}
          </p>
          <p className="text-muted-foreground text-sm">
            {isOn
              ? "Users can't reach tasks, the dashboard or redemptions. Admins are unaffected."
              : "Everything is open. Switching this on locks users out immediately and emails them."}
          </p>
        </div>

        <Switch
          checked={isOn}
          disabled={pending}
          aria-label="Maintenance mode"
          onCheckedChange={(next) => {
            startTransition(async () => {
              const result = await setMaintenanceMode(next, message);

              if ("error" in result) {
                toast.error(result.error);
                return;
              }

              if (next) {
                setMessage("");
                toast.success(
                  result.notified
                    ? `Maintenance is on. ${result.notified} user(s) emailed.`
                    : "Maintenance is on. No email went out — check the mail configuration.",
                );
              } else {
                toast.success("Platform is live again. Submission count reset.");
              }
            });
          }}
        />
      </div>

      {!isOn ? (
        <div className="space-y-1.5">
          <label
            htmlFor="maintenance-message"
            className="text-sm font-medium"
          >
            Message to users <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="maintenance-message"
            rows={2}
            maxLength={500}
            value={message}
            disabled={pending}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Shown on the maintenance page and in the email. Leave blank for the standard wording."
            className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring w-full resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
          />
        </div>
      ) : null}
    </div>
  );
}

export function AutoLimitControl({
  isOn,
  limit,
  submissionCount,
  maintenanceOn,
}: {
  isOn: boolean;
  limit: number;
  submissionCount: number;
  maintenanceOn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(String(limit));

  const parsed = Number(value);
  const valid = Number.isInteger(parsed) && parsed >= 1;
  const changed = valid && parsed !== limit;

  function save(nextOn: boolean, nextLimit: number) {
    startTransition(async () => {
      const result = await setAutoLimit(nextOn, nextLimit);

      if ("error" in result) {
        toast.error(result.error);
        return;
      }

      toast.success(
        nextOn
          ? `Auto maintenance at ${nextLimit.toLocaleString("en-IN")} submissions.`
          : "Auto maintenance is off. No submission limit.",
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {isOn ? `Stops at ${limit.toLocaleString("en-IN")} submissions` : "No limit"}
          </p>
          <p className="text-muted-foreground text-sm">
            {isOn
              ? "Once the count is reached the platform goes into maintenance on its own, and the switch above turns on."
              : "Submissions are accepted without a cap. Switch this on to stop automatically at a set number."}
          </p>
        </div>

        <Switch
          checked={isOn}
          disabled={pending || !valid}
          aria-label="Auto maintenance limit"
          onCheckedChange={(next) => save(next, valid ? parsed : limit)}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="auto-limit" className="text-sm font-medium">
          Submission limit
        </label>
        <div className="flex gap-2">
          <input
            id="auto-limit"
            type="number"
            min={1}
            value={value}
            disabled={pending}
            onChange={(e) => setValue(e.target.value)}
            className="border-input bg-background focus-visible:ring-ring w-40 rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
          />
          <button
            type="button"
            disabled={pending || !changed}
            onClick={() => save(isOn, parsed)}
            className="bg-foreground text-background rounded-md px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            Save
          </button>
        </div>
        {!valid ? (
          <p className="text-sm text-red-600">Enter a whole number of 1 or more.</p>
        ) : null}
      </div>

      <div className="space-y-2 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">
              {submissionCount.toLocaleString("en-IN")}
              {isOn ? ` of ${limit.toLocaleString("en-IN")}` : ""} submissions
            </p>
            <p className="text-muted-foreground text-xs">
              Counted since the platform last reopened.
            </p>
          </div>

          <button
            type="button"
            disabled={pending || maintenanceOn}
            onClick={() => {
              startTransition(async () => {
                const result = await resetSubmissionCount();

                if ("error" in result) {
                  toast.error(result.error);
                  return;
                }

                toast.success("Count reset. Starting again from now.");
              });
            }}
            className="rounded-md border px-3 py-1.5 text-xs font-medium disabled:opacity-40"
          >
            Reset count
          </button>
        </div>

        {isOn ? (
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-foreground h-full rounded-full"
              style={{
                width: `${Math.min(100, (submissionCount / limit) * 100)}%`,
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
