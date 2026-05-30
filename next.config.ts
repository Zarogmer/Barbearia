import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: false,
  images: {
    // Vitrine PBI-26: dono cola URL de Cloudinary/Imgur/CDN próprio.
    // Sem upload nesta fase — aceita qualquer host HTTPS.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
