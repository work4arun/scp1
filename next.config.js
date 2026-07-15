/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || "";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
};

module.exports = nextConfig;