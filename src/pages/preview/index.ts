import type { APIRoute } from "astro";
import {
  createPreviewClient,
  PREVIEW_COOKIE,
  previewHeaders,
  previewLinkResolver,
  validPreviewToken,
} from "../../lib/preview";
export const prerender = false;
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const token = url.searchParams.get("token");
  const documentID = url.searchParams.get("documentId");
  if (!token && !documentID) {
    if (cookies.has(PREVIEW_COOKIE)) {
      const response = redirect("/preview/view/", 302);
      for (const [k, v] of Object.entries(previewHeaders))
        response.headers.set(k, v);
      return response;
    }
    return new Response(
      '<!doctype html><html lang="en"><head><meta name="robots" content="noindex"><title>Prismic preview</title></head><body><h1>Prismic preview is ready</h1><p>Open a document in Prismic and select Preview to view unpublished content.</p><a href="/">Return to the website</a></body></html>',
      {
        headers: {
          ...previewHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      },
    );
  }
  if (!token || !documentID || !validPreviewToken(token))
    return new Response("A valid Prismic token and documentId are required.", {
      status: 400,
      headers: previewHeaders,
    });
  try {
    const client = createPreviewClient();
    const path = await client.resolvePreviewURL({
      previewToken: token,
      documentID,
      defaultURL: "/",
      linkResolver: previewLinkResolver,
    });
    if (!["/", "/privacy-policy/", "/terms-of-use/"].includes(path))
      throw new Error("Unsupported preview path.");
    cookies.set(PREVIEW_COOKIE, token, {
      path: "/",
      sameSite: "lax",
      secure: url.protocol === "https:",
      httpOnly: false,
      maxAge: 3600,
      encode: (value) => value,
    });
    const response = redirect("/preview/view" + path, 302);
    for (const [k, v] of Object.entries(previewHeaders))
      response.headers.set(k, v);
    return response;
  } catch {
    return new Response(
      "This preview could not be opened. Return to Prismic and start a new preview session.",
      { status: 400, headers: previewHeaders },
    );
  }
};
