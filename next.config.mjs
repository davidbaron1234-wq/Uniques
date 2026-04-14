/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent the app from being embedded in iframes on other domains (clickjacking)
          { key: "X-Frame-Options",        value: "DENY" },
          // Stop browsers from MIME-sniffing responses away from declared content-type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Only send origin in the Referer header for same-origin requests
          { key: "Referrer-Policy",        value: "strict-origin-when-cross-origin" },
          // Disable browser features we don't use
          { key: "Permissions-Policy",     value: "camera=(), microphone=(), geolocation=(), payment=()" },
          // Enable HSTS — tell browsers to always use HTTPS for this domain (1 year)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
