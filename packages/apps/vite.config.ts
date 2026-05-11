// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const wgwProxyTarget = process.env.WGW_PROXY_TARGET ?? "https://wegotworkspace.local:8443";

export default defineConfig({
  vite: {
    server: {
      proxy: {
        "/api/v1": {
          target: wgwProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
