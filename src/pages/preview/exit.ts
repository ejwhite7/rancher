import type { APIRoute } from "astro";
import { PREVIEW_COOKIE, previewHeaders } from "../../lib/preview";
export const prerender = false;
export const GET: APIRoute = ({ cookies, redirect }) => {
  cookies.delete(PREVIEW_COOKIE, { path: "/" });
  const response = redirect("/", 302);
  for (const [k, v] of Object.entries(previewHeaders))
    response.headers.set(k, v);
  return response;
};
