import { timingSafeEqual } from "node:crypto";
import type { APIRoute } from "astro";
import { syncSheetStages } from "../../../server/attio-stage-sync";
import { serverEnv } from "../../../server/database";
import { sanitizedErrorCode, serverLog } from "../../../server/logger";

export const prerender = false;
export const GET: APIRoute = async ({ request }) => {
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${serverEnv("CRON_SECRET")}`);
  if (
    !serverEnv("CRON_SECRET") ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const dryRun = new URL(request.url).searchParams.get("dry_run") === "1";
    return Response.json(await syncSheetStages(fetch, dryRun), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    await serverLog("error", "attio_stage_sync_failed", {
      error_code: sanitizedErrorCode(error),
    });
    return Response.json(
      { error: "Stage synchronization failed." },
      { status: 503 },
    );
  }
};
