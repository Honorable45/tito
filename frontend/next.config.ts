import type { NextConfig } from 'next';

// URL interne de l'API NestJS (jamais exposée au navigateur : les appels passent par /api).
const API_URL = (process.env.API_URL ?? 'http://localhost:4000').replace(/\/$/, '');
// Le relais /api est figé au build : sans API_URL, Vercel enverrait tout vers localhost.
if (process.env.VERCEL) {
  console.log(`Relais /api → ${API_URL}`);
  const host = URL.canParse(API_URL) ? new URL(API_URL).hostname : '';
  if (!API_URL.startsWith('https://') || !host.includes('.') || host === 'localhost') {
    throw new Error(`API_URL invalide sur Vercel (« ${process.env.API_URL ?? 'absente'} ») : utilisez l'adresse publique de l'API, puis redéployez.`);
  }
}

// Adresse publique du site (SEO, plan du site, liens envoyés sur WhatsApp).
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (vercelHost ? `https://${vercelHost}` : 'http://localhost:3000')).replace(/\/$/, '');
if (process.env.VERCEL && SITE_URL.includes('localhost')) throw new Error('Adresse du site introuvable : définissez NEXT_PUBLIC_SITE_URL sur Vercel.');

const config: NextConfig = {
  env: { NEXT_PUBLIC_SITE_URL: SITE_URL },
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Les images sont déjà déclinées en plusieurs largeurs (API, Cloudinary ou CDN Unsplash) : chargeur personnalisé.
    loader: 'custom',
    loaderFile: './src/lib/image-loader.ts',
  },
  async redirects() {
    return [
      { source: '/produits', destination: '/catalogue', permanent: true },
      { source: '/promotions', destination: '/catalogue?promo=1', permanent: false },
    ];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }];
  },
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [{ source: '/:path*', headers: security }];
  },
};

export default config;
