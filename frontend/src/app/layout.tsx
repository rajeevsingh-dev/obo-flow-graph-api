'use client';

import { Inter } from 'next/font/google'
import "./globals.css";
import MsalWrapper from '../components/MsalWrapper';

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MsalWrapper>
          {children}
        </MsalWrapper>
      </body>
    </html>
  )
} 