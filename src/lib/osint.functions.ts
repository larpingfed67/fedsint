import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import sitesData from "./sherlock-sites.json";

type Site = {
  url: string;
  urlMain: string;
  errorType: "status_code" | "message";
  errorMsg?: string[];
};

const SITES = sitesData as Record<string, Site>;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function checkSite(name: string, site: Site, username: string, signal: AbortSignal) {
  const url = site.url.replace("{}", encodeURIComponent(username));
  const profileUrl = url;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal,
    });
    if (site.errorType === "status_code") {
      const found = res.status >= 200 && res.status < 300;
      return { name, url: profileUrl, found, status: res.status };
    }
    // message: claimed if NONE of error messages appear in body
    const text = await res.text();
    const msgs = site.errorMsg ?? [];
    const hasErr = msgs.some((m) => text.includes(m));
    return { name, url: profileUrl, found: !hasErr && res.status < 400, status: res.status };
  } catch (e) {
    return { name, url: profileUrl, found: false, status: 0, error: (e as Error).name };
  }
}

async function runInChunks<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = items.slice(i, i + size);
    const r = await Promise.all(chunk.map(fn));
    out.push(...r);
  }
  return out;
}

export const runScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string }) =>
    z
      .object({
        username: z
          .string()
          .trim()
          .min(2)
          .max(50)
          .regex(/^[A-Za-z0-9_.-]+$/, "Letters, numbers, _ . - only"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const username = data.username;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 12_000);
    const entries = Object.entries(SITES);
    try {
      const results = await runInChunks(entries, 25, ([name, site]) =>
        checkSite(name, site, username, ac.signal),
      );
      const found = results.filter((r) => r.found);
      const { data: row, error } = await context.supabase
        .from("scans")
        .insert({
          user_id: context.userId,
          username,
          total_checked: results.length,
          found_count: found.length,
          results,
        })
        .select()
        .single();
      if (error) throw error;
      return {
        id: row.id as string,
        username,
        total: results.length,
        foundCount: found.length,
        results,
      };
    } finally {
      clearTimeout(timer);
    }
  });

export const listScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scans")
      .select("id, username, total_checked, found_count, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data ?? [];
  });

export const getScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("scans")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw error;
    return row;
  });

export const deleteScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("scans").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
