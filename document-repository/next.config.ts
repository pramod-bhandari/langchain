/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  env: {
    // Make server-side environment variables available to the client
    // Only include non-sensitive variables here
    OPENAI_MODEL_NAME: process.env.OPENAI_MODEL_NAME,
  },
  // Add any additional configuration as needed
};

export default nextConfig;
