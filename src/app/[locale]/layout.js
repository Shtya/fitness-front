import { Toaster } from 'react-hot-toast';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { Cairo, IBM_Plex_Sans_Arabic, Open_Sans } from 'next/font/google';
import './globals.css';
// import '@/../public/fonts/fonts.css';
import React from 'react';
import Layout from '../../components/molecules/Layout';
import AddToHomeGuide from '@/components/atoms/AddToHomeGuide';

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'], // أضف 'latin-ext' إذا تحتاج
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const arabicFont = Cairo({
  variable: '--font-arabic',
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const metadata = {
  title: 'FitPro - Transform Your Body, Transform Your Life',
  description: 'Professional fitness coaching platform with personalized workout plans, nutrition tracking, and progress analytics. Join thousands achieving their fitness goals.',
  keywords: 'fitness, workout, nutrition, personal trainer, exercise, health, wellness, body transformation, muscle building, weight loss',
  authors: [{ name: 'FitPro Team' }],
  creator: 'FitPro',
  publisher: 'FitPro',

  manifest: '/manifest.json',

  openGraph: {
    title: 'FitPro - Your Personal Fitness Revolution',
    description: 'AI-powered fitness coaching with personalized plans, real-time progress tracking, and expert guidance. Start your transformation journey today.',
    url: 'https://fitpro.com',
    siteName: 'FitPro Fitness Platform',
    locale: 'en_US',
    type: 'website',
  },

  // Icons for various platforms
  icons: {
    icon: [{ url: '/favicon.ico' }],
    shortcut: ['/logo.png'],
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
    other: [
      {
        rel: 'apple-touch-startup-image',
        url: '/logo.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        rel: 'apple-touch-startup-image',
        url: '/logo.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)',
      },
    ],
  },

  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'apple-mobile-web-app-title': 'FitPro',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#7C3AED',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#7C3AED',
  },

  // Robots.txt instructions
  robots: {
    index: true,
    follow: true,
    nocache: true,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  // Category for app stores
  category: 'health-fitness',
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} dir={locale == 'en' ? 'ltr' : 'rtl'} suppressHydrationWarning>
      <body className={`bg-[#fff] scroll ${arabicFont.variable} ${openSans.variable}`}>
        <NextIntlClientProvider locale={locale}>
          <Layout> {children} </Layout>
          <AddToHomeGuide />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
