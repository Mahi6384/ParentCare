import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  // Empty turbopack config silences the "webpack config but no turbopack config" warning.
  // next-pwa uses webpack internally — it still works in dev since SW is disabled there.
  turbopack: {},
};

export default withPWA({
  dest: "public",           // service worker output folder
  cacheOnFrontEndNav: true, // cache pages as user navigates
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,     // reload when user comes back online
  disable: process.env.NODE_ENV === "development", // disable SW in dev (avoids cache headaches)
  workboxOptions: {
    disableDevLogs: true,
  },
})(nextConfig);
