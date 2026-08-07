"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * Prev/next for a server-filtered table.
 *
 * Offset paging rather than a cursor: the admin table is sorted by a fixed
 * column, jumps are rare, and a row shifting between pages because someone
 * signed up mid-browse is not a problem worth a cursor to avoid.
 */
export function Pager({
  page,
  total,
  pageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  function go(to: number) {
    const next = new URLSearchParams(params.toString());
    if (to <= 1) next.delete("page");
    else next.set("page", String(to));

    startTransition(() => {
      router.replace(next.size ? `?${next}` : "?", { scroll: false });
    });
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        Page {page} of {pages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || pending}
          onClick={() => go(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages || pending}
          onClick={() => go(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
