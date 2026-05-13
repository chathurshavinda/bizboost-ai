const nextConfig = {
    reactStrictMode: true,
    transpilePackages: ["react-icons"],
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    experimental: {
        missingSuspenseWithCSRBailout: false,
    },
};
module.exports = nextConfig;
