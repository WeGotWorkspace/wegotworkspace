import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  experimental: {
    srcPath: "./",
    extract: {
      sourceLocale: "en",
    },
    messages: {
      path: "./messages",
      format: "json",
      locales: ["en"],
    },
  },
});

const officeBasePath = process.env.OFFICE_BASE_PATH || "/office";

const nextConfig: NextConfig = {
  basePath: officeBasePath,
  output: "export",
  async headers() {
    return [
      {
        source: "/x2t/x2t.wasm",
        headers: [
          {
            key: "Content-Encoding",
            value: "br",
          },
        ],
      },
      {
        source: "/x2t-:suffix/:path*",
        headers: [
          {
            key: "Content-Encoding",
            value: "br",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=31556952, immutable",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
