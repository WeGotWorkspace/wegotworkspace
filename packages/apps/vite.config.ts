import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveWgwProxyTarget } from "./scripts/wgw-proxy-target";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const wgwMonorepoRoot = path.join(__dirname, "..", "..", "..");
const wgwProxyTarget = resolveWgwProxyTarget();

export default defineConfig({
  base: "./",
  envDir: wgwMonorepoRoot,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
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
