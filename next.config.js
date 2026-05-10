/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  // pdf-parse reads test files at module init — must run in Node, not bundled by webpack
  serverExternalPackages: ["pdf-parse"],
};

module.exports = nextConfig;
