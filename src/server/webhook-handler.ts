import { timingSafeEqual } from "node:crypto";
import { hookdeckUrl } from "./webhook-outbox";

type Dependencies = {
  secret: string | undefined;
  destination: string | undefined;
  drain: (destination: URL) => Promise<unknown>;
};
export async function handleWebhookDelivery(
  request: Request,
  deps: Dependencies,
) {
  const json = (body: object, status: number) =>
    Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (request.method !== "GET")
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${deps.secret}`);
  if (
    !deps.secret ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return json({ error: "Unauthorized" }, 401);
  let destination: URL;
  try {
    destination = hookdeckUrl(deps.destination);
  } catch {
    return json({ error: "Webhook delivery is not configured." }, 503);
  }
  try {
    return json((await deps.drain(destination)) as object, 200);
  } catch {
    console.error("webhook_dispatch_failed");
    return json(
      {
        error:
          "Webhook delivery could not complete. Queued events are retained.",
      },
      503,
    );
  }
}
