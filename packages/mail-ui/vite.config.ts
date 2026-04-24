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
const privateDirName = process.env.SABRE_PRIVATE_DIR_NAME?.trim() || "wgw-modules";
const outDir = path.resolve(runtimeRoot, privateDirName, "mail/dist");

const phpOrigin = process.env.VITE_MAIL_PHP_ORIGIN ?? "http://127.0.0.1:8080";

export default defineConfig(({ command }) => ({
  // Build: relative assets + PHP <base href>; Dev: absolute /mail/ so fetches go to /mail/api/… on this origin.
  base: command === "build" ? "./" : "/mail/",
  ...(command !== "build"
    ? {
        server: {
          proxy: {
            "/mail/api": {
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
