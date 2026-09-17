import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";

type LogAttributes = Record<string, string | number | boolean>;
type LogLevel = "info" | "warn" | "error";

type Telemetry = {
  logger: ReturnType<LoggerProvider["getLogger"]>;
  provider: LoggerProvider;
};

const severity = {
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
} as const;

let telemetry: Telemetry | null | undefined;

function getTelemetry(): Telemetry | null {
  if (telemetry) return telemetry;

  const token = process.env.PUBLIC_POSTHOG_PROJECT_TOKEN?.trim();
  if (!token) return null;

  const exporter = new OTLPLogExporter({
    url:
      process.env.POSTHOG_LOGS_ENDPOINT?.trim() ||
      "https://us.i.posthog.com/i/v1/logs",
    headers: { Authorization: `Bearer ${token}` },
    timeoutMillis: 1_500,
    concurrencyLimit: 1,
  });
  const provider = new LoggerProvider({
    resource: resourceFromAttributes({
      "service.name": process.env.OTEL_SERVICE_NAME?.trim() || "rancher-web",
      "service.version": process.env.VERCEL_GIT_COMMIT_SHA || "development",
      "deployment.environment.name":
        process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      ...(process.env.VERCEL_REGION
        ? { "cloud.region": process.env.VERCEL_REGION }
        : {}),
    }),
    processors: [
      new BatchLogRecordProcessor({
        exporter,
        maxQueueSize: 64,
        maxExportBatchSize: 16,
        scheduledDelayMillis: 250,
        exportTimeoutMillis: 1_500,
      }),
    ],
  });
  telemetry = { provider, logger: provider.getLogger("rancher-server") };
  return telemetry;
}

export async function serverLog(
  level: LogLevel,
  message: string,
  attributes: LogAttributes = {},
) {
  console[level](message, attributes);
  const client = getTelemetry();
  if (!client) return;

  client.logger.emit({
    severityNumber: severity[level],
    severityText: level.toUpperCase(),
    body: message,
    attributes,
  });
  try {
    await client.provider.forceFlush({ timeoutMillis: 1_500 });
  } catch {
    console.warn("otel_log_export_failed");
  }
}
