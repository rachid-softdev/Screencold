/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  // Enable compression (enabled by default in production)
  compress: true,
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Enable modern formats for better performance
    formats: ['image/avif', 'image/webp'],
  },
  
  // Optimize chunking
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Separate vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
            },
          },
        },
      };
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG || "screencold",
  project: process.env.SENTRY_PROJECT || "screencold-web",
}));