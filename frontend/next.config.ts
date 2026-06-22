import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  // Pin the workspace root to this app so Next doesn't pick a stray
  // lockfile elsewhere on the machine when inferring the root.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
