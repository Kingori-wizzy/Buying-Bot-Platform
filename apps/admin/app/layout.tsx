import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { AdminShell } from '@/components/AdminShell';

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
    <html lang="en-KE">
      <body>
        <AdminShell>{children}</AdminShell>
      </body>
    </html>
  );
}
