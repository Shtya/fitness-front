import { Toaster } from 'react-hot-toast';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { IBM_Plex_Sans_Arabic, Open_Sans } from 'next/font/google';
import './globals.css';
// import '@/../public/fonts/fonts.css';
import React from 'react';
import Layout from '../../components/molecules/Layout';

const openSans = Open_Sans({
  variable: '--font-open-sans',
  subsets: ['latin'], // أضف 'latin-ext' إذا تحتاج
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const arabicSans = IBM_Plex_Sans_Arabic({
  variable: '--font-arabic',
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export const metadata = {
  title: 'Fitness app',
  description: 'Fitness app  ',
  manifest: '/manifest.json',
  themeColor: '#2563eb',
  openGraph: {
    title: 'Fitness app',
    description: 'Fitness app  ',
    url: 'https://yourdomain.com',
    siteName: 'Fitness app',
    images: [
      {
        url: 'https://yourdomain.com/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Fitness app Preview',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Fitness app  ',
    images: ['https://yourdomain.com/images/twitter-card.jpg'],
    creator: '@formflow',
  },

  icons: {
    icon: '/favicon.ico',
    shortcut: '/icon.png',
  },
};

export default async function RootLayout({ children, params }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} dir={locale == 'en' ? 'ltr' : 'rtl'} suppressHydrationWarning>
      <body className={`bg-[#fff] scroll ${arabicSans.variable} ${openSans.variable}`}>
        <NextIntlClientProvider locale={locale}>
          <Layout> {children} </Layout>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
