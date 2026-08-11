import { Toaster } from 'react-hot-toast';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { Inter, Open_Sans, Roboto_Mono, Space_Grotesk, Tajawal } from 'next/font/google';
import './globals.css';
import "./theme-tokens.css";

import React from 'react';
import Layout from '../../components/molecules/Layout';
import AddToHomeGuide from '@/components/atoms/AddToHomeGuide';
import ConfigAos from '@/config/Aos';

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

const arabicFont = Tajawal({
  variable: '--font-arabic',
  subsets: ['arabic'],
  weight: ['300', '400', '500', '700', '800'],
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const viewport = {
  themeColor: '#1e293b',
};

export const metadata = {
  manifest: '/manifest.json',
  title: 'so7bafit - Transform Your Body, Transform Your Life',
  description: 'Professional fitness coaching platform with personalized workout plans, nutrition tracking, and progress analytics. Join thousands achieving their fitness goals.',
  keywords: 'fitness, workout, nutrition, personal trainer, exercise, health, wellness, body transformation, muscle building, weight loss',

  openGraph: {
    title: 'so7bafit - Your Personal Fitness Revolution',
    description: 'AI-powered fitness coaching with personalized plans, real-time progress tracking, and expert guidance. Start your transformation journey today.',
    url: 'so7bafit.com',
    siteName: 'so7bafit Fitness Platform',
    locale: 'en_US',
    type: 'website',
  },

  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/icons/icon-192.png'],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html translate='no' lang={locale} dir={locale == 'en' ? 'ltr' : 'rtl'} suppressHydrationWarning>
      <head>
        <link rel='manifest' href='/manifest.json' />
        <link rel='icon' href='/icons/favicon-32.png' sizes='32x32' type='image/png' />
        <link rel='apple-touch-icon' href='/icons/apple-touch-icon.png' sizes='180x180' />
      </head>

      <body className={`bg-[#fff] scroll ${arabicFont.variable} ${openSans.variable} ${spaceGrotesk.variable} ${robotoMono.variable} ${inter.variable}`}>
        <NextIntlClientProvider locale={locale}>
          <Layout>
            {children}
            <AddToHomeGuide />
						<ConfigAos />
          </Layout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
