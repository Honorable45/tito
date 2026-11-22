import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center bg-paper px-4 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="display mt-3 text-[44px]">Page introuvable</h1>
      <p className="mt-2 max-w-md text-muted">Ce produit n’est plus en ligne ou l’adresse est incorrecte.</p>
      <div className="mt-8 flex gap-2.5">
        <Link href="/catalogue" className="glass-dark inline-flex h-12 items-center rounded-full px-6 text-[15px] font-medium text-white">
          Catalogue
        </Link>
        <Link href="/" className="inline-flex h-12 items-center px-4 text-[15px] font-medium text-accent underline">
          Accueil
        </Link>
      </div>
    </div>
  );
}
