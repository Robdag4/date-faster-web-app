import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/auth-provider';
import { Suspense } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Date Faster - Find Your Perfect Date',
  description: 'The premium dating app that connects you with local singles through real experiences. Speed dating events, singles mixers, and curated date packages.',
  keywords: 'dating app, speed dating, singles mixer, date packages, local dating, premium dating',
  authors: [{ name: 'Date Faster' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Date Faster - Find Your Perfect Date',
    description: 'The premium dating app that connects you with local singles through real experiences.',
    url: 'https://app.datefaster.com',
    siteName: 'Date Faster',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Date Faster App',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Date Faster - Find Your Perfect Date',
    description: 'The premium dating app that connects you with local singles through real experiences.',
    images: ['/og-image.jpg'],
  },
  manifest: '/manifest.json',
  themeColor: '#EE3550',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <head>
        <style>{`
          .safe-area-bottom {
            padding-bottom: env(safe-area-inset-bottom);
          }
          .slider::-webkit-slider-thumb {
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #EE3550;
            cursor: pointer;
            border: 2px solid #fff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          }
          .slider::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #EE3550;
            cursor: pointer;
            border: 2px solid #fff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          }
          .line-clamp-2 {
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        `}</style>
      </head>
      <body className={`${inter.className} h-full overflow-x-hidden`}>
        <Suspense fallback={<div className="min-h-screen bg-cream-50" />}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Suspense>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#1f2937',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: '500',
              padding: '12px 16px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}