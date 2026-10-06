import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { getTransformedRoutes } from "@vercel/routing-utils";

const config = JSON.parse(
  readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
);
const transformed = getTransformedRoutes(config);

function destination(path: string) {
  expect(transformed.error).toBeNull();
  for (const route of transformed.routes || []) {
    if (!("src" in route) || !route.src || !("dest" in route) || !route.dest)
      continue;
    const match = new RegExp(route.src).exec(path);
    if (match)
      return route.dest.replace(/\$(\d+)/g, (_, index) => match[Number(index)]);
  }
  return undefined;
}

test("PostHog logs and Conversations rewrites strip only the unsupported trailing slash", () => {
  for (const slash of ["", "/"]) {
    expect(destination(`/ingest/i/v1/logs${slash}`)).toBe(
      "https://us.i.posthog.com/i/v1/logs",
    );
    for (const path of [
      "v1/widget/tickets",
      "v1/widget/tickets/ticket-id/messages",
    ]) {
      expect(destination(`/ingest/api/conversations/${path}${slash}`)).toBe(
        `https://us.i.posthog.com/api/conversations/${path}`,
      );
    }
  }
});

test("other PostHog endpoints and application routes retain their routing", () => {
  for (const path of ["e/", "s/", "flags/", "report/"]) {
    expect(destination(`/ingest/${path}`)).toBe(
      `https://us.i.posthog.com/${path}`,
    );
  }
  expect(destination("/ingest/static/array.js")).toBe(
    "https://us-assets.i.posthog.com/static/array.js",
  );
  expect(destination("/ingest/array/project-token/config")).toBe(
    "https://us-assets.i.posthog.com/array/project-token/config",
  );
  expect(destination("/api/submissions/")).toBeUndefined();
  expect(destination("/blog/")).toBeUndefined();
});
