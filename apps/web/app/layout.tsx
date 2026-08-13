import './globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: {
    default: 'Buying Bot',
    template: '%s · Buying Bot',
  },
  description: 'Kenya-first commerce storefront',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-KE">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            Buying Bot
          </Link>
          <nav className="nav" aria-label="Primary">
            <Link href="/products">Products</Link>
            <Link href="/search">Search</Link>
            <Link href="/cart">Cart</Link>
            <Link href="/checkout">Checkout</Link>
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
