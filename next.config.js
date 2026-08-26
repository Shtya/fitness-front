const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();
const defaultPwaCache = require('next-pwa/cache');

// next-pwa precaches every file under public/ by default. That is ~275MB here
// (225MB of exercise videos alone), all downloaded the moment the installed PWA
// first activates — which is why the first open crawls. Precache the app shell
// only; the runtime caches below still keep each asset after it is first used.
const PRECACHE_EXCLUDES = [
  '!noprecache/**/*',
  '!uploads/**/*',
  '!sounds/**/*',
  '!screens/**/*',
  '!transform/**/*',
  '!sf-pro-display/**/*',
  '!**/*.{mp4,webm,mov,mp3,wav,ogg}',
  // Multi-megabyte artwork that is only needed on the marketing/auth screens.
  '!auth-*.png',
  '!hero-avatar.png',
  '!meta.png',
  '!bg-whatsapp.svg',
];

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  publicExcludes: PRECACHE_EXCLUDES,
  buildExcludes: [
    /app-build-manifest\.json$/,
    /middleware-manifest\.json$/,
  ],
  // Prefer a short NetworkFirst for navigations so cold PWA opens feel snappy,
  // then fall through to the stock next-pwa rules for static assets.
  runtimeCaching: [
    // Never let Workbox touch API traffic (uploads / multipart especially).
    {
      urlPattern: ({ url }) =>
        /(?:^|\.)so7bafit\.com$/i.test(url.hostname) &&
        (url.hostname.startsWith('api.') || url.pathname.includes('/api/')),
      handler: 'NetworkOnly',
      method: 'GET',
    },
    {
      urlPattern: ({ url }) =>
        /(?:^|\.)so7bafit\.com$/i.test(url.hostname) &&
        (url.hostname.startsWith('api.') || url.pathname.includes('/api/')),
      handler: 'NetworkOnly',
      method: 'POST',
    },
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'so7ba-pages',
        networkTimeoutSeconds: 8,
        expiration: { maxEntries: 48, maxAgeSeconds: 60 * 60 * 24 * 7 },
      },
    },
    ...defaultPwaCache,
  ],
});

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: false,
  devIndicators: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.jsdelivr.net', pathname: '/gh/faker-js/**' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // particle-playground API routes use fs under public/. NFT then tries to
  // ship the whole public/ tree (~276MB, mostly uploads videos) into the
  // serverless function and blows past Vercel's 250MB uncompressed limit.
  outputFileTracingExcludes: {
    '/api/particle-playground/**/*': [
      './public/uploads/**/*',
      './public/sounds/**/*',
      './public/screens/**/*',
      './public/transform/**/*',
      './public/sf-pro-display/**/*',
      './public/logo/**/*',
      './public/images/**/*',
      './public/fonts/**/*',
      './public/icons/**/*',
      './public/templates/**/*',
      './public/**/*.{mp4,webm,mov,mp3,wav,ogg}',
    ],
  },
};

module.exports = withPWA(withNextIntl(nextConfig));
