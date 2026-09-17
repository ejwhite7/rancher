import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;
export function serverEnv(name: string): string | undefined {
  return process.env[name] || import.meta.env?.[name];
}
export function database() {
  if (client) return client;
  const url = serverEnv("POSTGRES_URL") || serverEnv("DATABASE_URL");
  if (!url) throw new Error("Database connection is not configured.");
  const host = new URL(url).hostname;
  client = postgres(url, {
    max: 3,
    prepare: false, // Supabase transaction pooler does not support named prepared statements.
    connect_timeout: 10,
    idle_timeout: 20,
    ssl: ["localhost", "127.0.0.1", "[::1]", "postgres"].includes(host)
      ? false
      : "require",
  });
  return client;
}
