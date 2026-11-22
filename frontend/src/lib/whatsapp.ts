import { formatPrice } from './format';

/** Numéro au format wa.me : chiffres uniquement, indicatif pays compris. Null s'il est absent ou trop court. */
export function waNumber(raw: string | null | undefined) {
  const digits = (raw ?? '').replace(/\D/g, '').replace(/^00/, '');
  return digits.length >= 8 ? digits : null;
}

/**
 * Lien WhatsApp universel : wa.me ouvre l'application sur mobile et WhatsApp Web (ou l'application) sur ordinateur.
 * Le texte est encodé avec encodeURIComponent : accents, retours à la ligne, « & » et « # » sont préservés.
 */
export function waLink(number: string | null | undefined, text?: string) {
  const n = waNumber(number);
  if (!n) return null;
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export interface OrderLine {
  shopName: string;
  product: string;
  reference: string;
  /** Options choisies, dans l'ordre d'affichage : [["Couleur", "Noir"], ["Stockage", "256 Go"]]. */
  options: [string, string][];
  unitPrice: number;
  quantity: number;
  url?: string;
}

/** Espaces ordinaires dans le message : certains claviers affichent mal les espaces insécables. */
const price = (v: number) => formatPrice(v).replace(/\u00a0/g, ' ');

/** Message de commande prérempli, au format attendu par la boutique. */
export function orderMessage(o: OrderLine) {
  return [
    `Bonjour ${o.shopName},`,
    '',
    'Je souhaite commander le produit suivant :',
    '',
    `Produit : ${o.product}`,
    `Référence : ${o.reference}`,
    ...o.options.map(([label, value]) => `${label} : ${value}`),
    `Prix : ${price(o.unitPrice)}`,
    `Quantité : ${o.quantity}`,
    ...(o.quantity > 1 ? [`Total : ${price(o.unitPrice * o.quantity)}`] : []),
    ...(o.url ? ['', `Lien : ${o.url}`] : []),
    '',
    'Merci de me confirmer la disponibilité.',
  ].join('\n');
}

export function contactMessage(shopName: string) {
  return `Bonjour ${shopName}, j'ai une question.`;
}
