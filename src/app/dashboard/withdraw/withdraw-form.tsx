"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InkButton, InkError } from "@/components/paper/form";
import { cancelWithdrawal, requestWithdrawal } from "@/lib/actions/payouts";
import { MIN_WITHDRAWAL_POINTS } from "@/lib/validations";

type Method = "upi" | "paytm";

export function WithdrawForm({
  available,
  upiId,
  paytmNumber,
}: {
  available: number;
  upiId: string | null;
  paytmNumber: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<Method>(upiId ? "upi" : "paytm");
  const [pending, startTransition] = useTransition();

  const destination = method === "upi" ? upiId : paytmNumber;
  const canRequest = available >= MIN_WITHDRAWAL_POINTS && Boolean(destination);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await requestWithdrawal(formData);
      if ("error" in result) setError(result.error);
      else toast.success("Request filed — we'll pay it within 48 hours.");
    });
  }

  return (
    <form action={onSubmit} className="ink-card space-y-5 p-6">
      <input type="hidden" name="method" value={method} />

      <div>
        <h2 className="text-xl">Request a withdrawal</h2>
        <p className="caption mt-1 text-sm">
          ₹{available.toLocaleString("en-IN")} available · minimum{" "}
          {MIN_WITHDRAWAL_POINTS} points
        </p>
      </div>

      <InkError>{error}</InkError>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Pay me via</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { key: "upi" as Method, label: "UPI", value: upiId },
              { key: "paytm" as Method, label: "Paytm", value: paytmNumber },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setMethod(opt.key)}
              disabled={!opt.value || pending}
              aria-pressed={method === opt.key}
              className="rounded-2xl border-2 border-[var(--ink)] p-4 text-left disabled:opacity-45"
              style={{
                background:
                  method === opt.key ? "var(--cream)" : "#fff",
                boxShadow:
                  method === opt.key ? "-3px 3px 0 0 var(--blue)" : "none",
              }}
            >
              <span className="text-sm font-bold">{opt.label}</span>
              <span className="caption mono mt-1 block truncate text-xs">
                {opt.value ?? "Not added yet"}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">
          Amount in points
        </span>
        <input
          name="amountPoints"
          type="number"
          inputMode="numeric"
          min={MIN_WITHDRAWAL_POINTS}
          max={available}
          step={1}
          defaultValue={available >= MIN_WITHDRAWAL_POINTS ? available : ""}
          required
          disabled={pending || !canRequest}
          className="ink-input"
        />
        <span className="caption mt-1.5 block text-xs">
          1 point = ₹1, so this is exactly what lands in your account.
        </span>
      </label>

      <InkButton type="submit" disabled={pending || !canRequest}>
        {pending ? "Filing request…" : "Request withdrawal"}
      </InkButton>

      {!destination ? (
        <p className="caption text-xs">
          Add your {method === "upi" ? "UPI ID" : "Paytm number"} in your profile
          to use this method.
        </p>
      ) : null}
    </form>
  );
}

export function CancelButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await cancelWithdrawal(id);
          if ("error" in result) toast.error(result.error);
          else toast.success("Request cancelled — your points are free again.");
        })
      }
      className="mono flex-none text-[0.68rem] font-bold underline disabled:opacity-50"
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}
