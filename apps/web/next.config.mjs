/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@agentwise/sdk"],
  turbopack: {
    root: ".",
  },
};

export default nextConfig;
