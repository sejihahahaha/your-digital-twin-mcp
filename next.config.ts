import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Scripts folder contains test/dev utilities with external imports
    tsconfigPath: "./tsconfig.json",
  },
};

export default nextConfig;
