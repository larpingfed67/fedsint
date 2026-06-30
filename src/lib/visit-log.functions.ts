import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

export const logVisit = createServerFn({ method: "POST" }).handler(async () => {
  try {
    const req = getRequest();
    const url = new URL(req.url);
    // Skip internal/asset/api paths
    if (
      url.pathname.startsWith("/_") ||
      url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/assets/") ||
      /\.[a-z0-9]+$/i.test(url.pathname)
    ) {
      return { ok: true, skipped: true };
    }

    const headers = req.headers;
    const ip =
      headers.get("cf-connecting-ip") ||
      headers.get("x-real-ip") ||
      (headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      getRequestIP({ xForwardedFor: true }) ||
      null;
    const country = headers.get("cf-ipcountry") || null;
    const userAgent = getRequestHeader("user-agent") || null;
    const referrer = getRequestHeader("referer") || null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("visit_logs").insert({
      ip,
      user_agent: userAgent,
      path: url.pathname,
      referrer,
      country,
    });
  } catch (e) {
    console.error("[visit-log] failed", e);
  }
  return { ok: true };
});
