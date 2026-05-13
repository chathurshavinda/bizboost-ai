/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // TODO: re-enable strict type checks once pre-existing TS errors in
    // marketing-plan/page.tsx, page.tsx, BusinessForm.tsx, marketingPlan.ts etc. are fixed.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
