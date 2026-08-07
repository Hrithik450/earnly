"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { InkButton, InkError, InkField } from "@/components/paper/form";
import { cancelRedemption, requestRedemption } from "@/lib/actions/redemptions";
import { type GiftCardBrand } from "@/lib/gift-cards";
import {
  MAX_UPI_COINS,
  MIN_UPI_COINS,
  PAYOUT_METHOD_COPY,
  type PayoutMethod,
} from "@/lib/payout-methods";

/**
 * The redeem form, in whichever shapes are currently open.
 *
 * `methods` and `brands` come from the database on every render, so anything the
 * admin has switched off is not merely hidden here — it never reaches the
 * client. The server action re-checks both anyway, for the tab that was already
 * open when the switch was flipped.
 *
 * Shown whatever the balance is. A user below the threshold sees the real form
 * with the amounts locked, which says what another few tasks buys — where a
 * "come back later" card only says no.
 */
export function RedeemForm({
  available,
  methods,
  brands,
}: {
  available: number;
  methods: PayoutMethod[];
  brands: GiftCardBrand[];
}) {
  const [method, setMethod] = useState<PayoutMethod>(methods[0]);

  return (
    <div className="space-y-6">
      {methods.length > 1 ? (
        <div className="flex flex-wrap gap-3">
          {methods.map((m) => {
            const selected = m === method;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={selected}
                className="rounded-2xl border-2 border-[var(--ink)] px-5 py-2.5 text-sm font-bold"
                style={{
                  background: selected ? "var(--ink)" : "#fff",
                  color: selected ? "#fff" : "inherit",
                }}
              >
                {PAYOUT_METHOD_COPY[m].label}
              </button>
            );
          })}
        </div>
      ) : null}

      {method === "gift_card" ? (
        <GiftCardFields available={available} brands={brands} />
      ) : (
        <UpiFields available={available} />
      )}
    </div>
  );
}

/**
 * Brand picker, then denomination picker.
 *
 * Cards the balance cannot cover are shown rather than hidden — a locked ₹1000
 * card is the clearest statement of what another few tasks buys, where an empty
 * grid just reads as "nothing available".
 */
function GiftCardFields({
  available,
  brands,
}: {
  available: number;
  brands: GiftCardBrand[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [brand, setBrand] = useState<GiftCardBrand>(brands[0]);
  const [amount, setAmount] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  const affordable = brand.denominations.filter((d) => d <= available);
  const canSubmit = amount !== null && amount <= available;

  function pickBrand(next: GiftCardBrand) {
    setBrand(next);
    /* The old amount may not exist on the new brand, and even if it does it is a
       different card — better to make the choice explicit than to carry over a
       selection the user did not make. */
    setAmount(null);
    setError(null);
  }

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await requestRedemption(formData);
      if ("error" in result) setError(result.error);
      else {
        setAmount(null);
        toast.success("Requested — your code arrives within 48 hours.");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <input type="hidden" name="method" value="gift_card" />
      <input type="hidden" name="brandId" value={brand.id} />
      <input type="hidden" name="amountCoins" value={amount ?? ""} />

      <section>
        <h2 className="text-2xl">Pick a card</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {brands.map((card) => {
            const selected = card.id === brand.id;
            const cheapest = Math.min(...card.denominations);

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => pickBrand(card)}
                disabled={pending}
                aria-pressed={selected}
                className="rounded-2xl border-2 border-[var(--ink)] p-5 text-left transition-transform disabled:opacity-50"
                style={{
                  background: selected ? "var(--cream)" : "#fff",
                  boxShadow: selected ? "-4px 4px 0 0 var(--ink)" : "none",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="sticker"
                    style={{
                      background: card.accent,
                      color:
                        card.accent === "var(--yellow)" ||
                        card.accent === "var(--sky)"
                          ? "var(--ink)"
                          : "#fff",
                    }}
                  >
                    {card.name}
                  </span>
                  {card.spendableLikeCash ? (
                    <span className="mono text-[0.6rem] font-bold tracking-[0.12em] uppercase opacity-60">
                      Spends like cash
                    </span>
                  ) : null}
                </div>

                <p className="caption mt-3 text-sm leading-relaxed">
                  {card.blurb}
                </p>

                <p className="mono mt-3 text-[0.68rem] font-bold opacity-60">
                  From {cheapest} coins
                  {available < cheapest ? " · not yet unlocked" : ""}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="ink-card space-y-5 p-6">
        <div>
          <h2 className="text-xl">How much {brand.name}?</h2>
          <p className="caption mt-1 text-sm">
            {available.toLocaleString("en-IN")} coins available · 1 coin = ₹1 of
            card value
          </p>
        </div>

        <InkError>{error}</InkError>

        <div className="flex flex-wrap gap-3">
          {brand.denominations.map((value) => {
            const locked = value > available;
            const selected = amount === value;

            return (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                disabled={locked || pending}
                aria-pressed={selected}
                className="rounded-2xl border-2 border-[var(--ink)] px-5 py-3 text-left disabled:opacity-40"
                style={{
                  background: selected ? "var(--ink)" : "#fff",
                  color: selected ? "#fff" : "inherit",
                }}
              >
                <span className="block text-lg font-bold">₹{value}</span>
                <span className="mono block text-[0.62rem] font-bold opacity-70">
                  {locked ? `needs ${value - available} more` : `${value} coins`}
                </span>
              </button>
            );
          })}
        </div>

        {affordable.length === 0 ? (
          <p className="caption text-sm">
            Your balance doesn&rsquo;t reach a {brand.name} card yet. Finish a
            few more tasks, or pick a cheaper card above.
          </p>
        ) : null}

        <InkButton type="submit" disabled={pending || !canSubmit}>
          {pending
            ? "Requesting…"
            : amount
              ? `Redeem ${amount} coins for ₹${amount} ${brand.name}`
              : affordable.length === 0
                ? `${Math.min(...brand.denominations) - available} more coins for the smallest card`
                : "Choose an amount"}
        </InkButton>

        <p className="caption text-xs">{brand.delivery}</p>
      </section>
    </form>
  );
}

/**
 * Amount, then destination.
 *
 * The ID is typed rather than picked from a saved one: the handle is stored on
 * the redemption row, not the profile, so each request records where that
 * particular payment was sent and editing a profile can never rewrite history.
 */
function UpiFields({ available }: { available: number }) {
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [pending, startTransition] = useTransition();

  const ceiling = Math.min(available, MAX_UPI_COINS);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await requestRedemption(formData);
      if ("error" in result) setError(result.error);
      else {
        setAmount("");
        toast.success("Requested — the transfer lands within 48 hours.");
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-8">
      <input type="hidden" name="method" value="upi" />

      <section className="ink-card space-y-5 p-6">
        <div>
          <h2 className="text-xl">How much?</h2>
          <p className="caption mt-1 text-sm">
            {available.toLocaleString("en-IN")} coins available · 1 coin = ₹1 ·
            between {MIN_UPI_COINS} and{" "}
            {MAX_UPI_COINS.toLocaleString("en-IN")} coins a request
          </p>
        </div>

        <InkError>{error}</InkError>

        <InkField
          label="Amount in coins"
          name="amountCoins"
          type="number"
          inputMode="numeric"
          min={MIN_UPI_COINS}
          max={ceiling}
          step={1}
          required
          disabled={pending}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={String(MIN_UPI_COINS)}
          caption={
            available < MIN_UPI_COINS
              ? `You need ${MIN_UPI_COINS} coins for the smallest transfer.`
              : `You can request up to ${ceiling.toLocaleString("en-IN")} coins right now.`
          }
        />

        <InkField
          label="Your UPI ID"
          name="upiId"
          type="text"
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          value={upiId}
          onChange={(e) => setUpiId(e.target.value)}
          placeholder="yourname@bank"
          caption="Check it carefully — a transfer to the wrong ID can't be pulled back."
        />

        <InkButton type="submit" disabled={pending || available < MIN_UPI_COINS}>
          {pending
            ? "Requesting…"
            : available < MIN_UPI_COINS
              ? `${MIN_UPI_COINS - available} more coins to transfer`
              : "Request transfer"}
        </InkButton>

        <p className="caption text-xs">
          {PAYOUT_METHOD_COPY.upi.delivery} A person makes the transfer by hand,
          usually the same day and always within 48 hours.
        </p>
      </section>
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
          const result = await cancelRedemption(id);
          if ("error" in result) toast.error(result.error);
          else toast.success("Request cancelled — your coins are free again.");
        })
      }
      className="mono flex-none text-[0.68rem] font-bold underline disabled:opacity-50"
    >
      {pending ? "Cancelling…" : "Cancel"}
    </button>
  );
}

/**
 * The issued code, revealed on tap.
 *
 * Hidden by default because this page is the kind of thing people open in
 * public, and a voucher code is bearer credential — anyone who reads it over a
 * shoulder can spend it.
 */
export function CardCode({ code, pin }: { code: string; pin: string | null }) {
  const [shown, setShown] = useState(false);

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => setShown(true)}
        className="mono mt-3 rounded-xl border-2 border-dashed border-[var(--ink)] px-4 py-2.5 text-xs font-bold"
      >
        Tap to reveal your code
      </button>
    );
  }

  return (
    <div
      className="mt-3 rounded-xl border-2 border-[var(--ink)] px-4 py-3"
      style={{ background: "var(--cream)" }}
    >
      <p className="mono text-sm font-bold break-all select-all">{code}</p>
      {pin ? (
        <p className="mono mt-1 text-xs font-bold break-all select-all opacity-70">
          PIN {pin}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(pin ? `${code} (PIN ${pin})` : code);
          toast.success("Copied.");
        }}
        className="mono mt-2 text-[0.68rem] font-bold underline"
      >
        Copy
      </button>
    </div>
  );
}
