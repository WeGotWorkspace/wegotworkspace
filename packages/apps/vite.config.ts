import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWgwProxyTarget } from "./scripts/wgw-proxy-target";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wgwMonorepoRoot = path.join(__dirname, "..", "..", "..");
const wgwProxyTarget = resolveWgwProxyTarget();

const DEFAULT_DEV_PORT = 5173;
const DEFAULT_PREVIEW_PORT = 4173;

function resolveWgwVitePort(raw: string | undefined, defaultPort: number, envVar: string): number {
  if (raw === undefined || raw.trim() === "") {
    return defaultPort;
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    console.warn(`[vite] Ignoring invalid ${envVar}=${JSON.stringify(raw)}; using ${defaultPort}`);
    return defaultPort;
  }
  return parsed;
}

const wgwEnv = loadEnv(process.env.NODE_ENV ?? "development", wgwMonorepoRoot, "WGW_");
const devPort = resolveWgwVitePort(wgwEnv.WGW_VITE_DEV_PORT, DEFAULT_DEV_PORT, "WGW_VITE_DEV_PORT");
const previewPort = resolveWgwVitePort(
  wgwEnv.WGW_VITE_PREVIEW_PORT,
  DEFAULT_PREVIEW_PORT,
  "WGW_VITE_PREVIEW_PORT",
);

export default defineConfig({
  // Absolute base so SPA deep links (e.g. /contacts/all/:id) resolve /assets/* correctly on refresh.
  base: "/",
  envDir: wgwMonorepoRoot,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: false,
      devOptions: { enabled: false },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,ico,png,woff2,webmanifest}"],
      },
      manifest: false,
    }),
  ],
  server: {
    // Bind all interfaces so both http://127.0.0.1 and http://localhost work (Node may otherwise listen on ::1 only).
    host: true,
    port: devPort,
    strictPort: true,
    proxy: {
      "/api/v1": {
        target: wgwProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: previewPort,
    strictPort: true,
    proxy: {
      "/api/v1": {
        target: wgwProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  publicDir: "public",
});
