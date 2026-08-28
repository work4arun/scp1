// Shared base-path helper for sub-path hosting (BASE_PATH, e.g. /cbo-scp).
//
// next/link and next/navigation are base-path aware automatically, but raw
// <a href> anchors and client fetch()/POST to "/api/..." are NOT prefixed.
// Use withBase() for those so they resolve under the deployment base path
// instead of leaking to the origin root (which another project may own).
//
// NEXT_PUBLIC_BASE_PATH is baked at build time in the Dockerfile, so it is
// available on the client. When absent (root hosting) withBase is a no-op.

export const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");

export function withBase(path: string): string {
  return basePath ? `${basePath}${path}` : path;
}