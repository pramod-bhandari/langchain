/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    serverComponentsExternalPackages: ["pdf-lib", "pdfjs-dist"],
  },
  // Ensure API routes are properly handled
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Handle PDF.js worker correctly
    if (isServer) {
      // For server components, ensure pdfjs-dist works properly
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false, // Disable canvas for server
      };
    }
    
    return config;
  },
};

export default nextConfig;
