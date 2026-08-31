/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  reactStrictMode: true,
  // ESLint is a separate CI gate (`pnpm lint`) because API routes use
  // repository-local rules loaded through the ESLint CLI `--rulesdir` option.
  // Next's embedded lint runner cannot load those definitions during `next build`.
  eslint: {
    ignoreDuringBuilds: true,
  },
  poweredByHeader: false,
  compress: true,
  transpilePackages: ['@ems/database', '@ems/shared', '@ems/auth'],
  async redirects() {
    return [
      {
        source: '/wms/transfers',
        destination: '/wms/operations?tab=transfers',
        permanent: false,
      },
      {
        source: '/eps/custom-fields',
        destination: '/eps/settings?tab=fields',
        permanent: false,
      },
      {
        source: '/eps/import',
        destination: '/admin/module-settings?tab=eps&subtab=import',
        permanent: false,
      },
      {
        source: '/eps/tags',
        destination: '/eps/settings?tab=tags',
        permanent: false,
      },
      {
        source: '/eps/settings',
        destination: '/admin/module-settings?tab=eps',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' data: https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https: http: ws: wss:",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
  webpack(config, { dev }) {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
