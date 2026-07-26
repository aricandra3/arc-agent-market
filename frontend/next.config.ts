import path from "node:path";
import type { NextConfig } from "next";

/**
 * Turbopack's workspace root.
 *
 * Next infers this from lockfiles, and a stray `pnpm-lock.yaml` in the user's
 * home directory makes it pick `~` — hence the need to pin it.
 *
 * It must point at the *repository* root, not this app directory. Pinning it to
 * `frontend/` made cold compiles take over two minutes at ~860% CPU, because
 * dependency resolution has to walk above the root into the repo-level
 * `node_modules`. With the repo root, the same compile takes a few seconds.
 *
 * Derived from this file's location rather than `process.cwd()`, which changes
 * depending on the directory the dev server is launched from.
 */
const workspaceRoot = path.resolve(__dirname, "..");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
