// Local API dev server — an alternative to `vercel dev` for running the
// serverless functions in api/*.js locally.
//
// Why this exists: `vercel dev`'s own Node function runtime was hanging
// indefinitely on every request in this environment (api/products.js never
// returned, even though the exact same code connects to the database in
// under a second when run directly with plain `node`). This server just
// imports each api/*.js handler directly and calls it with a small
// Vercel-compatible req/res shim (req.query, res.status/json/send/redirect) —
// no vercel dev, no hanging.
//
// Usage: node dev-server.mjs   (defaults to port 3210; set PORT to change)
// Vite's dev server (vite.config.ts) proxies /api/* here.
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PORT = process.env.PORT || 3210;

// Static (non-dynamic) routes, matched by exact pathname.
const STATIC_ROUTES = {
  "/api/products": "api/products.js",
  "/api/orders": "api/orders.js",
  "/api/messages": "api/messages.js",
  "/api/product-image": "api/product-image.js",
  "/api/category-image": "api/category-image.js",
  "/api/sitemap": "api/sitemap.js",
  "/api/seller/products": "api/seller/products.js",
  "/api/seller/orders": "api/seller/orders.js",
  "/api/seller/analytics": "api/seller/analytics.js",
  "/api/seller/clear-history": "api/seller/clear-history.js",
};

// Dynamic [param] routes — mirrors Vercel's file-based routing for
// api/admin/[resource].js and api/auth/[action].js.
const DYNAMIC_ROUTES = [
  { prefix: "/api/admin/", file: "api/admin/[resource].js", param: "resource" },
  { prefix: "/api/auth/", file: "api/auth/[action].js", param: "action" },
];

// Re-imported fresh on every request (cache-busted via query param) so edits
// to an api/*.js file take effect immediately, with no server restart.
async function loadHandler(file) {
  const url = pathToFileURL(path.resolve(file)).href + `?t=${Date.now()}`;
  const mod = await import(url);
  return mod.default;
}

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://localhost:${PORT}`);
  req.query = Object.fromEntries(u.searchParams.entries());

  res.status = function (code) { this.statusCode = code; return this; };
  res.json = function (obj) {
    this.setHeader("Content-Type", "application/json");
    this.end(JSON.stringify(obj));
  };
  res.send = function (body) { this.end(body); };
  res.redirect = function (code, url) {
    this.statusCode = code;
    this.setHeader("Location", url);
    this.end();
  };

  let file = STATIC_ROUTES[u.pathname];
  if (!file) {
    for (const r of DYNAMIC_ROUTES) {
      if (u.pathname.startsWith(r.prefix)) {
        file = r.file;
        req.query[r.param] = u.pathname.slice(r.prefix.length);
        break;
      }
    }
  }

  if (!file) {
    res.status(404).json({ error: `No local route for ${u.pathname}` });
    return;
  }

  try {
    const handler = await loadHandler(file);
    await handler(req, res);
  } catch (e) {
    console.error(`[dev-server] ${u.pathname} ->`, e);
    if (!res.headersSent) res.status(500).json({ error: e.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Local API dev server ready at http://localhost:${PORT}`);
});
