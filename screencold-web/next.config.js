/** @type {import('next').NextConfig} */
const { withSentryConfig } = require("@sentry/nextjs");

// Bundle analyzer (optional) — wrap require so missing dep doesn't crash lint/dev
let withBundleAnalyzer = (config) => config;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  withBundleAnalyzer = require("@next/bundle-analyzer")({
    enabled: process.env.ANALYZE === "true",
  });
} catch {
  // @next/bundle-analyzer not installed — skip
}

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  compress: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: "vendors",
              chunks: "all",
            },
          },
        },
      };
    }
    return config;
  },
};

module.exports = withBundleAnalyzer(
  withSentryConfig(nextConfig, {
    silent: true,
    org: process.env.SENTRY_ORG || "screencold",
    project: process.env.SENTRY_PROJECT || "screencold-web",
  })
);