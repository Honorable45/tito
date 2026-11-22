import { CONDITION_PARAM, GROUP_PARAM, SORTS } from './labels';

export type RawParams = Record<string, string | string[] | undefined>;

/** Paramètres d'adresse reconnus par le catalogue (les autres sont ignorés). */
const KEYS = ['q', 'categorie', 'marque', 'etat', 'min', 'max', 'dispo', 'promo', 'rayon', 'tri', 'page'] as const;
export type Params = Partial<Record<(typeof KEYS)[number], string>>;

export function readParams(raw: RawParams): Params {
  const out: Params = {};
  for (const k of KEYS) {
    const v = raw[k];
    const s = (Array.isArray(v) ? v[0] : v)?.trim();
    if (s) out[k] = s.slice(0, 120);
  }
  return out;
}

const int = (v?: string) => (v && /^\d{1,9}$/.test(v) ? v : undefined);

/** Traduit l'adresse publique (en français) en requête pour l'API. */
export function apiQuery(p: Params, fixed: { category?: string; brand?: string }) {
  const q = new URLSearchParams();
  const set = (k: string, v?: string) => v && q.set(k, v);
  set('q', p.q);
  set('category', fixed.category ?? p.categorie);
  set('brand', fixed.brand ?? p.marque);
  set('condition', p.etat ? CONDITION_PARAM[p.etat] : undefined);
  set('minPrice', int(p.min));
  set('maxPrice', int(p.max));
  if (p.dispo === '1') q.set('available', '1');
  if (p.promo === '1') q.set('promo', '1');
  set('group', p.rayon ? GROUP_PARAM[p.rayon]?.api : undefined);
  set('order', SORTS.find((s) => s.value === p.tri)?.api);
  set('page', int(p.page));
  q.set('pageSize', '24');
  return q.toString();
}

/** Lien vers le catalogue avec des paramètres modifiés ; toute modification de filtre revient à la page 1. */
export function hrefWith(base: string, current: Params, changes: Params | Record<string, string | null>) {
  const next: Record<string, string> = Object.fromEntries(Object.entries(current).filter((e): e is [string, string] => Boolean(e[1])));
  if (!('page' in changes)) delete next.page;
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === undefined || v === '') delete next[k];
    else next[k] = v;
  }
  const s = new URLSearchParams(next).toString();
  return s ? `${base}?${s}` : base;
}
