import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { SITE_URL } from '@/lib/site';
import './globals.css';

// Polices auto-hébergées (licence SIL OFL) : aucun appel à un service tiers.
const serif = localFont({
  src: [
    { path: './fonts/newsreader-latin-opsz-normal.woff2', weight: '200 800', style: 'normal' },
    { path: './fonts/newsreader-latin-opsz-italic.woff2', weight: '200 800', style: 'italic' },
  ],
  variable: '--font-newsreader',
  display: 'swap',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
});
const sans = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-sans-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/ibm-plex-sans-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-plex-sans',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
});
const mono = localFont({
  src: [{ path: './fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400' }],
  variable: '--font-plex-mono',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'TitoTrade — Smartphones, ordinateurs, téléviseurs et accessoires', template: '%s · TitoTrade' },
  description: 'Smartphones, ordinateurs portables et de bureau, téléviseurs, écrans et accessoires, neufs, d’occasion ou reconditionnés. Prix en FCFA, commande par WhatsApp.',
  openGraph: { type: 'website', locale: 'fr_FR', siteName: 'TitoTrade' },
  icons: { icon: [{ url: '/favicon-48.png', sizes: '48x48', type: 'image/png' }, { url: '/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: '/apple-touch-icon.png' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#12203f',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
