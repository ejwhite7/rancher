import type { APIRoute } from "astro";
import { serverEnv } from "../../../server/database";
import { publishPipelineReport } from "../../../server/pipeline-report";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (request.headers.get("authorization") !== `Bearer ${serverEnv("CRON_SECRET")}`)
    return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await publishPipelineReport());
  } catch (error) {
    console.error("Pipeline report failed", error);
    return Response.json({ error: "Pipeline report failed" }, { status: 500 });
  }
};
