import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
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
