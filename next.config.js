const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin();
const crypto = require('crypto');
const fs = require('fs');
const defaultPwaCache = require('next-pwa/cache');

// next-pwa precaches every file under public/ unless told otherwise. Even with the large
// folders excluded that was ~70MB of artwork (fake-chat avatars, particle assets, a 2MB
// favicon) on top of the build files: on a phone the worker sat in "installing" for minutes,
// and any failed request or closed app meant it never activated, so nothing worked offline.
// Precache only what the offline shell needs from public/; images are still kept by the
// runtime caches below the first time they are shown.
const SHELL_PUBLIC_FILES = [
  'offline.html',
  'manifest.json',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
  'icons/favicon-16.png',
  'icons/icon.svg',
];

const shellPrecacheEntries = SHELL_PUBLIC_FILES.filter(file => fs.existsSync(`public/${file}`)).map(file => ({
  url: `/${file}`,
  revision: crypto.createHash('md5').update(fs.readFileSync(`public/${file}`)).digest('hex'),
}));

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // An explicit list replaces next-pwa's sweep of the whole public/ folder.
  additionalManifestEntries: shellPrecacheEntries,
  buildExcludes: [
    /app-build-manifest\.json$/,
    /middleware-manifest\.json$/,
  ],
  // Page navigations are handled by worker/index.js (network first → saved page → /offline.html),
  // which runs before these rules. Static assets: precache + the stock next-pwa rules.
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
    ...defaultPwaCache,
  ],
});

const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  reactStrictMode: false,
  devIndicators: false,
  transpilePackages: ['@mediapipe/tasks-vision'],
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
