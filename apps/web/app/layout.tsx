import './globals.css';

import type { Metadata } from 'next';
import { DM_Sans, Syne } from 'next/font/google';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { SiteHeader } from '@/components/SiteHeader';

const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-bb-sans',
  display: 'swap',
});

const display = Syne({
  subsets: ['latin'],
  variable: '--font-bb-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Buying Bot',
    template: '%s · Buying Bot',
  },
  description:
    'Kenya-first AI shopping — browse, chat, checkout, and pay securely via escrow.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-KE" className={`${sans.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="site-footer-inner">
            <strong>Buying Bot</strong>
            <p style={{ margin: 0 }}>
              Prices, stock, tax, and payment status come from the Nest API —
              never from the browser.
            </p>
            <p style={{ margin: 0 }}>
              <Link href="/assistant">AI assistant</Link>
              {' · '}
              <Link href="/">Categories</Link>
              {' · '}
              <Link href="/cart">Cart</Link>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
