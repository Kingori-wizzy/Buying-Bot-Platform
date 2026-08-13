import './globals.css';

import type { Metadata } from 'next';
import { DM_Sans, Syne } from 'next/font/google';
import type { ReactNode } from 'react';

import { AdminShell } from '@/components/AdminShell';

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
    default: 'Buying Bot Admin',
    template: '%s · Admin',
  },
  description: 'Operations portal',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-KE" className={`${sans.variable} ${display.variable}`}>
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
