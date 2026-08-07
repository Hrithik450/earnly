"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";

/**
 * The filter bar for the users table.
 *
 * Filters live in the URL rather than in component state, which is what lets
 * the server do the filtering: the page re-renders as a server component for
 * every change. It also means a filtered view can be linked, reloaded, and
 * navigated back to.
 *
 * Only this bar is a client component — the table itself stays on the server.
 */
export function UserFilters({
  industries,
  countries,
}: {
  industries: string[];
  countries: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [query, setQuery] = useState(params.get("q") ?? "");

  function apply(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString());

    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }

    /* Any filter change invalidates the page number — page 4 of the old result
       set is not page 4 of the new one, and is usually past its end. */
    next.delete("page");

    startTransition(() => {
      router.replace(next.size ? `?${next}` : "?", { scroll: false });
    });
  }

  /* Debounced so a query runs per pause, not per keystroke. Each one is a round
     trip and a database scan; firing on every character would queue work the
     next character invalidates. */
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;

    const timer = setTimeout(() => apply({ q: query }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const status = params.get("status") ?? "all";
  const industry = params.get("industry") ?? "";
  const country = params.get("country") ?? "";
  const filtering = Boolean(query || industry || country || status !== "all");

  const selectClass =
    "border-input bg-background h-9 max-w-[14rem] rounded-md border px-3 text-sm";

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      /* Dimmed while a query is in flight, so a slow filter reads as loading
         rather than as a filter that did nothing. */
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, email, phone, hobbies…"
        aria-label="Search users"
        className="w-full sm:max-w-xs"
      />

      <select
        value={status}
        onChange={(e) => apply({ status: e.target.value })}
        aria-label="Filter by status"
        className={selectClass}
      >
        <option value="all">All accounts</option>
        <option value="active">Active only</option>
        <option value="blocked">Blocked</option>
        <option value="admin">Admins</option>
      </select>

      <select
        value={industry}
        onChange={(e) => apply({ industry: e.target.value })}
        aria-label="Filter by industry"
        className={selectClass}
      >
        <option value="">Any industry</option>
        {industries.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <select
        value={country}
        onChange={(e) => apply({ country: e.target.value })}
        aria-label="Filter by country"
        className={selectClass}
      >
        <option value="">Any country</option>
        {countries.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      {filtering ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            apply({ q: "", status: "", industry: "", country: "" });
          }}
          className="text-muted-foreground text-sm underline underline-offset-2"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
