/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse reads test files at module load time; excluding it from the
    // webpack bundle prevents a "module not found" crash in the API route.
    serverComponentsExternalPackages: ['pdf-parse', '@react-pdf/renderer', '@napi-rs/canvas'],
  },
};

module.exports = nextConfig;
//testcomment