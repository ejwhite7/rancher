import { test, expect } from "@playwright/test";
import { createClient } from "@prismicio/client";
import seed from "../prismic/seed/homepage.json" with { type: "json" };
import { previewLinkResolver, validPreviewToken } from "../src/lib/preview";

test("preview entry and exit are uncached, unindexed, and validate input", async ({
  request,
}) => {
  const ready = await request.get("/preview/");
  expect(ready.status()).toBe(200);
  expect(await ready.text()).toContain("Prismic preview is ready");
  expect(ready.headers()["cache-control"]).toContain("no-store");
  expect(ready.headers()["x-robots-tag"]).toContain("noindex");
  for (const path of [
    "/preview/?token=bad",
    "/preview/?documentId=home",
    "/preview/?token=bad%3Bcookie&documentId=home",
  ])
    expect((await request.get(path)).status()).toBe(400);
  const view = await request.get("/preview/view/", { maxRedirects: 0 });
  expect(view.status()).toBe(302);
  expect(view.headers().location).toBe("/");
  const exit = await request.get("/preview/exit/", { maxRedirects: 0 });
  expect(exit.status()).toBe(302);
  expect(exit.headers()["set-cookie"]).toContain("io.prismic.preview=");
  expect(exit.headers()["cache-control"]).toContain("no-store");
});

test("preview URL resolution uses the draft ref and shared documents resolve to Home", async () => {
  const refs: string[] = [];
  const client = createClient("rancher-test", {
    fetch: async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/v2")
        return Response.json({
          refs: [
            {
              id: "master",
              ref: "published",
              label: "Master",
              isMasterRef: true,
            },
          ],
          types: { homepage: "Homepage" },
          languages: [],
        });
      refs.push(url.searchParams.get("ref")!);
      return Response.json({
        results: [{ id: "home", type: "homepage", data: {}, url: null }],
        page: 1,
        results_size: 1,
        total_results_size: 1,
        total_pages: 1,
      });
    },
  });
  expect(
    await client.resolvePreviewURL({
      previewToken: "draft-ref",
      documentID: "home",
      defaultURL: "/",
      linkResolver: previewLinkResolver,
    }),
  ).toBe("/");
  expect(refs).toEqual(["draft-ref"]);
  expect(validPreviewToken("draft;injected")).toBe(false);
});

test("simulator renders all nine Astro slices and rejects invalid payloads", async ({
  request,
}) => {
  const response = await request.post("/slice-simulator/render/", {
    data: seed.slices,
  });
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).toContain("Make Your Business Data");
  expect(html).toContain("data-slice-zone");
  expect(html).toContain("astro-island");
  expect(html).not.toContain("POSTHOG_BROWSER_SNIPPET");
  expect(
    (
      await request.post("/slice-simulator/render/", {
        data: [{ slice_type: "unknown" }],
      })
    ).status(),
  ).toBe(400);
  expect((await request.get("/slice-simulator/render/")).status()).toBe(405);
});

test("official Prismic simulator bridge updates Astro-rendered thumbnails", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    // Vite serves the installed official client for this development-server test.
    const moduleURL = "/node_modules/@prismicio/simulator/dist/index.js";
    const { SimulatorClient } = await import(moduleURL);
    const frame = document.createElement("iframe");
    frame.id = "test-simulator";
    document.body.append(frame);
    const client = new SimulatorClient(frame);
    (window as any).simulatorTestClient = client;
    frame.src = "/slice-simulator/";
    await client.connect({ sliceZoneSizeAPI: true });
  });
  const hero = structuredClone(
    seed.slices.find((s) => s.slice_type === "hero")!,
  );
  hero.primary.heading![0].text = "Draft simulator headline";
  await page.evaluate(
    async (slices) => {
      await (window as any).simulatorTestClient.setSliceZone(slices);
    },
    [hero],
  );
  const render = page
    .frameLocator("#test-simulator")
    .frameLocator("#rendered-slices");
  await expect(render.getByRole("heading", { level: 1 })).toHaveText(
    "Draft simulator headline",
  );
  hero.primary.heading![0].text = "Updated without publishing";
  await page.evaluate(
    async (slices) => {
      await (window as any).simulatorTestClient.setSliceZone(slices);
    },
    [hero],
  );
  await expect(render.getByRole("heading", { level: 1 })).toHaveText(
    "Updated without publishing",
  );
});

test("live preview callback renders shared content and keeps legal navigation in the session", async ({
  page,
}) => {
  test.skip(
    process.env.PRISMIC_CONTENT_MODE !== "prismic",
    "Requires live repository access.",
  );
  const client = createClient("rancher");
  const ref = await client.getMasterRef();
  const home = await client.getSingle("homepage");
  const response = await page.goto(
    `/preview/?${new URLSearchParams({ token: ref.ref, documentId: home.id })}`,
  );
  expect(response?.status()).toBe(200);
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page).toHaveURL(/\/preview\/view\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Make Your Business Data",
  );
  await page.getByRole("link", { name: "Privacy Policy", exact: true }).click();
  await expect(page).toHaveURL(/\/preview\/view\/privacy-policy\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Privacy Policy",
  );
  await page.getByRole("link", { name: "Exit preview", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:4322/");
  expect(
    (await page.context().cookies()).some(
      (c) => c.name === "io.prismic.preview",
    ),
  ).toBe(false);
});
