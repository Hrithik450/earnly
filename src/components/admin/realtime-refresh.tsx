"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Refreshes the current admin route whenever a row changes on a watched table.
 *
 * The payload is deliberately ignored. Realtime is used only as a change ping —
 * `router.refresh()` re-runs the server component, so the rendered data still
 * comes from the privileged Drizzle connection rather than from a client-side
 * read through the anon key. That keeps one source of truth and means the
 * columns shown here are not constrained by what RLS exposes to `anon`.
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`admin:${tables.join(",")}`);

    for (const table of tables) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => router.refresh(),
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    /* `tables` is a literal array at every call site, so join it rather than
       depend on the array identity — otherwise the channel is torn down and
       rebuilt on every render. */
  }, [router, tables.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
