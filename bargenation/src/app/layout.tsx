import type { Metadata } from 'next';
import { Bodoni_Moda, Archivo } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/chrome/SiteHeader';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { UtilityBar } from '@/components/chrome/UtilityBar';
import { MobileNav } from '@/components/chrome/MobileNav';

/**
 * Bodoni Moda (didone) for display, Archivo (grotesque) for interface.
 * A didone carries the editorial/fashion register the brief asks for without
 * borrowing any house's trade dress; Archivo keeps prices legible and has
 * true tabular figures, which the Index and price columns depend on.
 */
const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-bodoni',
  display: 'swap',
  weight: ['400', '500', '600'],
});

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://bargenation.example'),
  title: {
    default: 'Bargenation — before you buy it, check Bargenation',
    template: '%s · Bargenation',
  },
  description:
    'We record what things actually cost over time, then tell you whether today’s price is worth it. Sometimes the answer is no.',
  openGraph: {
    title: 'Bargenation',
    description:
      'We record what things actually cost over time, then tell you whether today’s price is worth it.',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bodoni.variable} ${archivo.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-ink focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <UtilityBar />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <MobileNav />
        {/* clears the fixed mobile bar so the footer is never trapped under it */}
        <div aria-hidden="true" className="h-[52px] lg:hidden" />
      </body>
    </html>
  );
}
