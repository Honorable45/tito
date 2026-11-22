const grouping = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 350000 → « 350 000 FCFA » (espaces insécables, lisibles en petite taille). */
export function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined) return '—';
  return `${grouping.format(value).replace(/[  ]/g, ' ')} FCFA`;
}

/** +22890000000 → « +228 90 00 00 00 » */
export function formatPhone(value: string | null | undefined) {
  if (!value) return '';
  const plus = value.trim().startsWith('+');
  const digits = value.replace(/\D/g, '');
  if (plus && digits.length > 8) return `+${digits.slice(0, digits.length - 8)} ${digits.slice(-8).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ');
}

export function telHref(value: string) {
  return `tel:${value.replace(/[^\d+]/g, '')}`;
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count > 1 ? plural : singular}`;
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Lome' });
export const formatDate = (d: string | Date) => dateFmt.format(new Date(d));
