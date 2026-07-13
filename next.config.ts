import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // StrictMode double-mounts the R3F canvas in dev, which force-loses the
  // WebGL context and leaves a black screen. Disabled until the XR/R3F
  // remount path handles it cleanly.
  reactStrictMode: false,
};

export default nextConfig;
