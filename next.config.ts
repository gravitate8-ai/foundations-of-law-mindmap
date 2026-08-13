import type { NextConfig } from "next";

// GitHub Pages serves project sites under /<repo-name>/, so the workflow
// passes BASE_PATH=/<repo-name> at build time. Local dev keeps it empty.
const basePath = process.env.BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
