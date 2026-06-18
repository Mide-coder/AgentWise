/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@agentwise/sdk"],
  experimental: {
    // Use SWC from the installed Next.js version, don't download separately
  },
};

export default nextConfig;
