/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse", "xlsx", "stripe", "openai"],
  outputFileTracingIncludes: {
    "/api/audio/**": ["./private/audio/**/*"],
    "/api/download/**": ["./private/audio/**/*"],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
