/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // pdf-parse reads test files at module load time; excluding it from the
    // webpack bundle prevents a "module not found" crash in the API route.
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', '@react-pdf/renderer', '@napi-rs/canvas'],
    // pdf-parse v2 loads its bundled worker via a dynamic import("./pdf.worker.mjs")
    // that Next.js's file tracer cannot statically discover, causing "Cannot find module
    // pdf.worker.mjs" in serverless deployments. Force all .mjs files in pdf-parse to
    // be included in the traced output for this route.
    outputFileTracingIncludes: {
      '/api/parse-resume': ['./node_modules/pdf-parse/dist/**/*.mjs'],
    },
  },
};

module.exports = nextConfig;