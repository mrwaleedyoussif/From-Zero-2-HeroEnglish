import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Paths the previous site on this domain may have registered its service worker under.
const OLD_WORKERS = ["/sw.js", "/service-worker.js"];

const nextConfig: NextConfig = {
  // A browser still holding the old site asks for its worker file: answer with the clean-up
  // worker, never cached, and tell the browser to drop what it saved for this address.
  headers: async () =>
    OLD_WORKERS.map((source) => ({
      source,
      headers: [
        { key: "Cache-Control", value: "no-store" },
        { key: "Clear-Site-Data", value: '"cache", "storage"' },
      ],
    })),
  experimental: {
    // Speaking answers (≈2 min of audio, max 8 MB) are uploaded through a server action.
    serverActions: { bodySizeLimit: "10mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
