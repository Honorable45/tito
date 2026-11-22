/** Encadré affiché dès qu'une page présente des produits de démonstration. */
export function DemoNotice({ show, className }: { show: boolean; className?: string }) {
  if (!show) return null;
  return (
    <p className={`rounded-2xl border-l-2 border-warn bg-warn-soft px-4 py-3 text-[13.5px] text-warn ${className ?? ''}`}>
      <strong className="font-semibold">Catalogue d’exemple.</strong> Prix, stocks et photos des produits marqués « Exemple » sont fictifs.
    </p>
  );
}
