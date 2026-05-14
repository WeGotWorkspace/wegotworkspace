import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "..");
const wgwProxyTarget = process.env.WGW_PROXY_TARGET ?? "https://wegotworkspace.local:8443";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {
      builder: {
        viteConfigPath: false,
      },
    },
  },
  async viteFinal(baseConfig) {
    return {
      ...baseConfig,
      /** Load `VITE_*` from repo root `.env.local` (same as `vite dev`). */
      envDir: repoRoot,
      server: {
        ...baseConfig.server,
        proxy: {
          ...baseConfig.server?.proxy,
          "/api/v1": {
            target: wgwProxyTarget,
            changeOrigin: true,
            secure: false,
          },
        },
      },
      resolve: {
        ...(baseConfig.resolve ?? {}),
        alias: {
          ...(baseConfig.resolve && "alias" in baseConfig.resolve && baseConfig.resolve.alias
            ? baseConfig.resolve.alias
            : {}),
          "@": path.join(repoRoot, "src"),
        },
      },
    };
  },
};
export default config;
