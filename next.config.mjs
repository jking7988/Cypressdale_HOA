/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.MEMBER_HUB_ENVIRONMENT === 'local' ? '.next-isolated' : '.next',
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    ] }];
  },
};
export default nextConfig;
