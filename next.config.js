const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,

  workboxOptions: {
    clientsClaim: true,
    cleanupOutdatedCaches: true,

    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],

    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'style' || request.destination === 'script' || request.destination === 'font',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'static-assets',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },

      {
        urlPattern: ({ request }) => ['style', 'script', 'worker', 'font'].includes(request.destination),
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },

      {
        urlPattern: ({ request }) => request.destination === 'image',
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'images-cache',
          expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },

      {
        urlPattern: /\/api\/(plans|meals|workouts)/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'plans-api',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },

      {
        urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 10 },
        },
      },

      {
        urlPattern: ({ request }) => request.mode === 'navigate',
        handler: 'NetworkFirst',
        options: {
          cacheName: 'pages-cache',
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
        },
      },
    ],
  },
});

const nextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.jsdelivr.net',
        pathname: '/gh/faker-js/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

module.exports = withNextIntl(withPWA(nextConfig));
