import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

test("exports privacy-safe server logs over authenticated OTLP HTTP", async () => {
  let authorization: string | undefined;
  let contentType: string | undefined;
  let bodyLength = 0;
  const server = createServer((request, response) => {
    authorization = request.headers.authorization;
    contentType = request.headers["content-type"];
    request.on("data", (chunk) => {
      bodyLength += chunk.length;
    });
    request.on("end", () => {
      response.writeHead(200).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");

  process.env.PUBLIC_POSTHOG_PROJECT_TOKEN = "phc_test";
  process.env.POSTHOG_LOGS_ENDPOINT = `http://127.0.0.1:${address.port}/i/v1/logs`;
  process.env.OTEL_SERVICE_NAME = "rancher-test";

  try {
    const { serverLog } = await import("../src/server/logger");
    await serverLog("error", "test_operational_failure", {
      error_code: "test_code",
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    delete process.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
    delete process.env.POSTHOG_LOGS_ENDPOINT;
    delete process.env.OTEL_SERVICE_NAME;
  }

  expect(authorization).toBe("Bearer phc_test");
  expect(contentType).toContain("application/json");
  expect(bodyLength).toBeGreaterThan(0);
});
