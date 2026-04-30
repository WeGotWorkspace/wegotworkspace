import path from "node:path";
import type { NextConfig } from "next";

const officeBasePath = process.env.OFFICE_BASE_PATH || "/office";
const repoRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  basePath: officeBasePath,
  output: "export",
  turbopack: {
    root: repoRoot,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
