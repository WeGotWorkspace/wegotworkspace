import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../../apps/wegotworkspace");
const runtimeRoot = process.env.SABRE_BUILD_DIR?.trim()
  ? path.resolve(appRoot, process.env.SABRE_BUILD_DIR.trim())
  : appRoot;
const privateDirName =
  process.env.SABRE_PRIVATE_DIR_NAME?.trim() || "wgw-modules";
const outDir = path.resolve(runtimeRoot, privateDirName, "install/dist");

const phpOrigin =
  process.env.VITE_INSTALL_PHP_ORIGIN ?? "http://127.0.0.1:8080";

export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/install/",
  ...(command !== "build"
    ? {
        server: {
          proxy: {
            "/install/api": {
              target: phpOrigin,
              changeOrigin: true,
            },
          },
        },
      }
    : {}),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
  },
}));
