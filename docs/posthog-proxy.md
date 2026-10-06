# PostHog proxy routing

The browser SDK uses `/ingest` as its API host. Vercel forwards SDK assets to
`us-assets.i.posthog.com` and API traffic to `us.i.posthog.com`.

## Slash-sensitive endpoints

Astro keeps `trailingSlash: "always"` for canonical website URLs. Some PostHog
endpoints do not accept that final slash:

- `/i/v1/logs`
- `/api/conversations/...`

The first two rewrites in `vercel.json` accept either slash form and forward these
endpoints without the final slash. They must precede the general `/ingest` rule.
Nested Conversations paths are preserved. External rewrites retain the original
request method, body and query parameters; no application proxy or credentials
are introduced. Other endpoints, including session replay `/s/` and CSP reports
`/report/`, retain their existing trailing slashes.

Regression: `tests/posthog-proxy.spec.ts` compiles the actual configuration with
the installed Vercel routing utilities, checking slash-sensitive endpoints,
nested paths, unchanged SDK assets and unrelated application paths.

The change requires a Vercel deployment. A local Astro dev server does not execute
Vercel's external rewrites. After deployment, read-only unauthenticated GET probes
should no longer return 404: logs returns 405 because it accepts POST, and widget
tickets returns 403 because the probe has no widget credentials. Do not send test
logs, messages or conversion events just to check routing.

References:

- https://posthog.com/docs/advanced/proxy/vercel
- https://posthog.com/docs/logs/troubleshooting#connection-issues

## Separately reported third-party blocks

Read-only inspection on 2026-10-06 identified two public GTM tags:

- RB2B loads `https://ddwl4m2hdecbv.cloudfront.net/b/0NW1GHJE87O4/0NW1GHJE87O4.js.gz`.
- OpenAI Ads loads `https://bzrcdn.openai.com/sdk/oaiq.min.js`; that SDK sends
  measurements to `https://bzr.openai.com/v1/sdk/events`.

The production homepage GET response had no Content-Security-Policy header or CSP
meta tag. The repository's explicit CSP is limited to the Slice Simulator route.
The exact blocking policy/document context is therefore **unconfirmed** without
the complete browser refusal message (directive, blocked URL and frame). These
requests are separate from the PostHog 404s.

The user approved allowing these vendors. Once the enforcing policy is located,
append these exact origins to its existing directives, preserving other rules:

- `script-src` (and `script-src-elem`, if separately configured):
  `https://ddwl4m2hdecbv.cloudfront.net` and `https://bzrcdn.openai.com`.
- `connect-src`: `https://bzr.openai.com`.

No new global CSP was invented and no unrelated policy or marketing consent was
relaxed. Appending a second CSP would not override a blocking first policy.

The subsequent browser message identifies **CORB**, not CSP. CSP origin additions
will not remedy CORB. A read-only probe of the exact RB2B script URL returned
CloudFront HTTP 403 with an HTML error page instead of JavaScript; that response
can trigger CORB when requested as a cross-origin script. This was observed from
the diagnostic environment, not captured from the user's browser.

A credential-free OpenAI events GET returned HTTP 400 JSON requiring `pid`; it
was deliberately not a real pixel request and does not establish why the user's
OpenAI measurement response was blocked. Inspect the actual blocked request's
status, MIME type and request mode before changing the SDK/tag. CORB can block
reading a response after the request was sent; it does not by itself prove the
measurement was rejected. No security bypass or test conversion was performed.

Reference: https://www.chromium.org/Home/chromium-security/corb-for-developers/
