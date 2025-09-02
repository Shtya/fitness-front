// const createNextIntlPlugin = require('next-intl/plugin');

// const withNextIntl = createNextIntlPlugin();

// const nextConfig = {
//   images: {
//     remotePatterns: [
//       {
//         protocol: 'https',
//         hostname: 'cdn.jsdelivr.net',
//         pathname: '/gh/faker-js/**',
//       },
//       {
//         protocol: 'https',
//         hostname: 'avatars.githubusercontent.com',
//         // pathname: '/gh/faker-js/**',
//       },
//     ],
//   },
// };

// module.exports = withNextIntl(nextConfig);


const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: ({ request }) =>
        request.destination === 'image' ||
        request.destination === 'style' ||
        request.destination === 'script' ||
        request.destination === 'font',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-assets',
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
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
      },
    },
  ],
});

const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();

const nextConfig = {
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
  reactStrictMode: true,
};

// دمج الاثنين مع بعض
module.exports = withNextIntl(withPWA(nextConfig));
