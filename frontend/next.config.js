/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:4001/api/:path*',
            },
            {
                source: '/health',
                destination: 'http://localhost:4001/health',
            },
        ];
    },
};

module.exports = nextConfig;
