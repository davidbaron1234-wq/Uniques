/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Lint runs in CI separately; skip during `next build` to avoid blocking on unused-var noise.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
    ],
  },
};

export default nextConfig;
