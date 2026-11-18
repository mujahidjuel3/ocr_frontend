import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // next lint currently fails under the installed ESLint/Next pairing; typecheck remains in CI via tsc/build.
  eslint: { ignoreDuringBuilds: true },
};

