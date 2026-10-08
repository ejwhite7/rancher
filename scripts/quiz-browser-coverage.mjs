import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Keep browser transforms separate from Node transforms: their V8 offsets differ.
export function browserCoverage(entries, root = process.cwd()) {
  const result = [];
  /** @type {Record<string, {data: {sources: string[], sourcesContent: string[]}, lineLengths: number[]}>} */
  const cache = {};
  for (const entry of entries) {
    const url = new URL(entry.url);
    if (
      !/^\/src\/(?:components\/(?:QuizFunnel\.tsx|useQuiz(?:Funnel|Analytics)\.ts)|lib\/quiz(?:-[\w-]+)?\.ts)$/.test(
        url.pathname,
      )
    )
      continue;
    const match = entry.source.match(
      /sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,([^\s]+)/,
    );
    if (!match) throw new Error(`Missing browser source map: ${url.pathname}`);
    const map = JSON.parse(Buffer.from(match[1], "base64").toString());
    map.sources = map.sources.map((source) => {
      const pathname = new URL(source, entry.url).pathname;
      return pathToFileURL(
        pathname.startsWith(`${root}/`) ? pathname : path.join(root, pathname),
      ).href;
    });
    map.sourceRoot = "";
    const generated = pathToFileURL(
      path.join(root, "coverage/browser-source", `${randomUUID()}.js`),
    ).href;
    result.push({
      scriptId: entry.scriptId,
      url: generated,
      functions: entry.functions,
    });
    cache[generated] = {
      data: map,
      lineLengths: entry.source.split("\n").map((line) => line.length),
    };
  }
  if (!result.length)
    throw new Error("No application browser coverage collected");
  return { result, "source-map-cache": cache };
}

export async function collectBrowserCoverage(page) {
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  return async () => {
    const report = browserCoverage(await page.coverage.stopJSCoverage());
    await mkdir("coverage/raw", { recursive: true });
    await writeFile(
      `coverage/raw/browser-${randomUUID()}.json`,
      JSON.stringify(report),
    );
  };
}
