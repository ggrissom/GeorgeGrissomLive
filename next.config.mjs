/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["pdf-parse", "xlsx", "stripe", "openai"]
};

export default nextConfig;
