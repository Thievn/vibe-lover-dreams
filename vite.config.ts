import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

/**
 * Open Graph / Twitter cards need absolute URLs matching the site users share.
 * Order: explicit env → Vercel production URL → Vercel preview URL → legacy default.
 */
function ogSiteOrigin(): string {
  const explicit = process.env.VITE_SITE_ORIGIN?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const vercelDeploy = process.env.VERCEL_URL?.trim();
  const host = vercelProd || vercelDeploy;
  if (host) {
    const u = host.startsWith("http") ? host : `https://${host}`;
    return u.replace(/\/$/, "");
  }

  return "https://lustforge.app";
}

/** Must match `src/lib/analytics.ts` — GA4 id in index.html for earliest load. */
function gaMeasurementIdForHtml(): string | null {
  const raw = (process.env.VITE_GA_MEASUREMENT_ID ?? "").trim();
  if (["0", "false", "off", "disabled"].includes(raw.toLowerCase())) return null;
  if (!raw) return "G-JF1831WS0G";
  if (raw.startsWith("G-")) return raw;
  if (/^\d+$/.test(raw)) return `G-${raw}`;
  return raw;
}

function googleTagSnippet(measurementId: string): string {
  return `    <!-- Google tag (gtag.js) — early load; SPA sends page_view from src/lib/analytics.ts -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}', { send_page_view: false, anonymize_ip: true });
    </script>
`;
}

export default defineConfig({
  plugins: [
    {
      name: "inject-og-site-origin",
      transformIndexHtml(html) {
        let out = html.replace(/__OG_SITE_ORIGIN__/g, ogSiteOrigin());
        const gaId = gaMeasurementIdForHtml();
        if (gaId && !out.includes("googletagmanager.com/gtag/js")) {
          out = out.replace(
            /<script type="module" src="\/src\/main\.tsx"><\/script>/,
            `${googleTagSnippet(gaId)}    <script type="module" src="/src/main.tsx"></script>`,
          );
        }
        return out;
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "og-image.png", "pwa-icon-192.png", "pwa-icon-512.png", "robots.txt"],
      manifest: {
        name: "LustForge AI",
        short_name: "LustForge",
        description: "Cyber-goth AI companions — immersive roleplay. 18+ only.",
        theme_color: "#050508",
        background_color: "#050508",
        display: "standalone",
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["entertainment", "lifestyle"],
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/pwa-icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        importScripts: ["/sw-notify.js"],
        globPatterns: ["**/*.{js,css,html,ico,svg,png,jpg,jpeg,webp,woff2}"],
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api/, /^\/auth\/callback/],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("recharts")) return "recharts";
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack/react-query")) return "react-query";
          if (id.includes("@radix-ui")) return "radix-ui";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
});
