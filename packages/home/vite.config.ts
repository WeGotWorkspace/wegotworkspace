import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../../apps/wegotworkspace");
const runtimeRoot = process.env.SABRE_BUILD_DIR?.trim()
  ? path.resolve(appRoot, process.env.SABRE_BUILD_DIR.trim())
  : appRoot;
const privateDirName = process.env.SABRE_PRIVATE_DIR_NAME?.trim() || "wgw-modules";
const outDir = path.resolve(runtimeRoot, privateDirName, "home/dist");

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    outDir,
    emptyOutDir: true,
    assetsDir: "home-assets",
  },
});
