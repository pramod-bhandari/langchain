/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Enable WebWorkers with the right loading for the "worker" syntax
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: { 
        loader: 'worker-loader',
        options: { 
          filename: 'static/chunks/[id].worker.[contenthash].js',
          publicPath: '/_next/'
        }
      }
    });

    // Add a rule to handle the canvas module in PDF.js
    if (isServer) {
      config.externals.push({
        canvas: 'commonjs canvas',
        'pdfjs-dist': 'commonjs pdfjs-dist',
      });
    }

    return config;
  },
  
  // Explicitly define environment variables to be made available to the client
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  },
  
  // Ensure environment variables are available at runtime
  publicRuntimeConfig: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
};

export default nextConfig; 