/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
      allowedOrigins: [
        "my-proxy.com",
        "*.my-proxy.com",
        "https://dyfk-com.vercel.app/",
      ],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  // i18n: {
  //   locales: ['en', 'fr', 'de'], // Supported locales
  //   defaultLocale: 'en', // Default locale
  // },
  reactStrictMode: true,
};

export default nextConfig;
