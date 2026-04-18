/**
 * Regenerates src/generated/marketingSurfaces.discovered.json from:
 * - Dashboard nav (parses src/lib/dashboardNav.ts)
 * - React Router paths in src/App.tsx
 *
 * Run via: node scripts/sync-marketing-surfaces.mjs
 * Hooked from package.json prebuild.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, data) {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(data, null, 2) + "\n", "utf8");
}

/** @type {{ id: string, kind: string, label: string, path: string }[]} */
const items = [];

// --- Dashboard tabs (must match DASHBOARD_NAV_ITEMS in dashboardNav.ts) ---
const navSrc = read("src/lib/dashboardNav.ts");
const navRe = /\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g;
let m;
while ((m = navRe.exec(navSrc)) !== null) {
  const id = m[1];
  const label = m[2];
  const allowed = new Set(["dashboard", "collection", "discover", "nexus", "toy", "history"]);
  if (!allowed.has(id)) continue;
  items.push({
    id,
    kind: "dashboard-tab",
    label,
    path: `/dashboard?nav=${encodeURIComponent(id)}`,
  });
}

// --- Top-level routes (marketing-relevant only) ---
const appSrc = read("src/App.tsx");
const routeRe = /<Route\s+path="([^"]+)"/g;
const rawPaths = new Set();
while ((m = routeRe.exec(appSrc)) !== null) {
  rawPaths.add(m[1]);
}

const skip = new Set([
  "/",
  "*",
  "/auth",
  "/reset-password",
  "/terms-of-service",
  "/privacy-policy",
  "/18-plus-disclaimer",
  "/dashboard",
]);

function routeMarketingRow(routePath) {
  if (skip.has(routePath)) return null;
  if (routePath === "/account") {
    return { id: "account", kind: "route", label: "Account", path: "/account" };
  }
  if (routePath === "/chat" || routePath === "/chat/:id") {
    return { id: "chat", kind: "route", label: "Chat", path: "/chat" };
  }
  if (routePath === "/companions/:id") {
    return {
      id: "companion-profile",
      kind: "route",
      label: "Companion profiles",
      path: "/dashboard?nav=discover",
    };
  }
  if (routePath === "/create-companion") {
    return { id: "create-companion", kind: "route", label: "Companion Forge", path: "/create-companion" };
  }
  if (routePath === "/settings") {
    return { id: "settings", kind: "route", label: "Settings", path: "/settings" };
  }
  if (routePath === "/admin") {
    return { id: "admin", kind: "route", label: "Admin", path: "/admin" };
  }
  const slug = routePath.replace(/^\//, "").replace(/\/:id$/, "").replace(/\//g, "-") || "home";
  return {
    id: `route-${slug}`,
    kind: "route",
    label: routePath,
    path: routePath.includes(":") ? routePath.replace(/:id/g, "example").replace(/:([^/]+)/g, "example") : routePath,
  };
}

const seenRouteIds = new Set();
for (const p of rawPaths) {
  const row = routeMarketingRow(p);
  if (!row) continue;
  if (seenRouteIds.has(row.id)) continue;
  seenRouteIds.add(row.id);
  items.push(row);
}

const out = {
  version: 1,
  generatedAt: new Date().toISOString(),
  items,
};

write("src/generated/marketingSurfaces.discovered.json", out);
console.log(`marketing discovery: wrote ${items.length} items to src/generated/marketingSurfaces.discovered.json`);
