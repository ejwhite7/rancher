import { createServer } from "node:http";
import { expect, test } from "@playwright/test";

test("exports privacy-safe server logs over authenticated OTLP HTTP", async () => {
  let authorization: string | undefined;
  let contentType: string | undefined;
  let bodyLength = 0;
  let requests = 0;
  const server = createServer((request, response) => {
    requests += 1;
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

  const { serverLog } = await import("../src/server/logger");
  const priorToken = process.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
  delete process.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
  try {
    await serverLog("info", "test_console_only");
    expect(requests).toBe(0);
  } finally {
    if (priorToken !== undefined)
      process.env.PUBLIC_POSTHOG_PROJECT_TOKEN = priorToken;
  }

  process.env.PUBLIC_POSTHOG_PROJECT_TOKEN = " phc_test ";
  process.env.POSTHOG_LOGS_ENDPOINT = `http://127.0.0.1:${address.port}/i/v1/logs`;
  process.env.OTEL_SERVICE_NAME = "rancher-test";

  try {
    await serverLog("error", "test_operational_failure", {
      error_code: "test_code",
    });
    expect(requests).toBe(1);
    delete process.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
    await serverLog("warn", "test_cached_provider");
    expect(requests).toBe(2);
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
