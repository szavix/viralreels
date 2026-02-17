/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@viralreels/shared", "@viralreels/supabase"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
    ],
  },
};

module.exports = nextConfig;
