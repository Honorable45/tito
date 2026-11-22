import { Footer } from '@/components/site/footer';
import { Header } from '@/components/site/header';
import { WhatsAppFloat } from '@/components/site/whatsapp-float';
import { getSettings } from '@/lib/settings';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        Aller au contenu
      </a>
      <Header shopName={settings.shopName} logoUrl={settings.logoUrl} whatsapp={settings.whatsapp} />
      <main id="contenu" className="pb-16 sm:pb-24">{children}</main>
      <Footer settings={settings} />
      <WhatsAppFloat whatsapp={settings.whatsapp} shopName={settings.shopName} />
    </>
  );
}
