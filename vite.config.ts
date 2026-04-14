import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

function ogSiteOrigin(): string {
  const raw = process.env.VITE_SITE_ORIGIN || "https://lustforge.app";
  return raw.replace(/\/$/, "");
}

export default defineConfig({
  plugins: [
    {
      name: "inject-og-site-origin",
      transformIndexHtml(html) {
        return html.replace(/__OG_SITE_ORIGIN__/g, ogSiteOrigin());
      },
    },
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "og-image.png", "robots.txt"],
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
            src: "/favicon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
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
