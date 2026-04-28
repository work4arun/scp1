/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  // Serve from a subpath (e.g. "/scp") when BASE_PATH is set.
  // Leave BASE_PATH empty to serve from root.
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

module.exports = nextConfig;
