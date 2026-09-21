import { homeHtml } from "./pages/home";
import { notFoundHtml } from "./pages/notFound";
import { privacyHtml } from "./pages/privacy";

interface Env {
  ASSETS?: Fetcher;
}

const HTML_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";
const NOT_FOUND_CACHE_CONTROL = "public, max-age=60";

const SECURITY_HEADERS: Record<string, string> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=(), microphone=(), camera=(), payment=()",
  "content-security-policy":
    "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function weakEtagFor(html: string): string {
  let hash = 5381;
  for (let index = 0; index < html.length; index++) {
    hash = ((hash << 5) + hash + html.charCodeAt(index)) | 0;
  }
  return `W/"${html.length.toString(36)}-${(hash >>> 0).toString(36)}"`;
}

interface Page {
  html: string;
  etag: string;
}

function page(html: string): Page {
  return { html, etag: weakEtagFor(html) };
}

const home = page(homeHtml);
const privacy = page(privacyHtml);
const notFound = page(notFoundHtml);

const ROUTES: Record<string, Page> = {
  "/": home,
  "/index.html": home,
  "/privacy": privacy,
  "/privacy.html": privacy,
  "/privacy-policy": privacy,
};

function normalizePath(pathname: string): string {
  if (pathname.length <= 1) return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

function htmlResponse(
  request: Request,
  target: Page,
  status: number,
  cacheControl: string
): Response {
  const headers = new Headers(SECURITY_HEADERS);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", cacheControl);
  headers.set("etag", target.etag);
  headers.set("vary", "Accept-Encoding");

  if (status === 200 && request.headers.get("if-none-match") === target.etag) {
    return new Response(null, { status: 304, headers });
  }

  const body = request.method === "HEAD" ? null : target.html;
  return new Response(body, { status, headers });
}

function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  if (!headers.has("cache-control")) {
    headers.set("cache-control", "public, max-age=86400");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" },
      });
    }

    const url = new URL(request.url);
    const path = normalizePath(url.pathname);

    const matched = ROUTES[path];
    if (matched) return htmlResponse(request, matched, 200, HTML_CACHE_CONTROL);

    if (env.ASSETS) {
      const asset = await env.ASSETS.fetch(new Request(url.origin + path, request));
      if (asset.status !== 404) return withSecurityHeaders(asset);
    }

    return htmlResponse(request, notFound, 404, NOT_FOUND_CACHE_CONTROL);
  },
};
