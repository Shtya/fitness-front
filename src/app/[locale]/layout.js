import { Toaster } from 'react-hot-toast';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { Cairo, Inter, Open_Sans, Roboto_Mono, Space_Grotesk } from 'next/font/google';
import './globals.css';
import React from 'react';
import Layout from '../../components/molecules/Layout';
import AddToHomeGuide from '@/components/atoms/AddToHomeGuide';

export const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'],
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

		google: 'notranslate',
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
    <html translate="no" lang={locale} dir={locale == 'en' ? 'ltr' : 'rtl'} suppressHydrationWarning>
      <body className={`bg-[#fff] scroll ${arabicFont.variable} ${openSans.variable} ${spaceGrotesk.variable} ${robotoMono.variable} ${inter.variable}`}>
        <NextIntlClientProvider locale={locale}>
          <Layout>
            {children}
            <div className='md:hidden'>
              <AddToHomeGuide />
            </div>
          </Layout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
