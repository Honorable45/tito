import {
  BarChart3,
  Boxes,
  ClipboardList,
  Cog,
  FolderTree,
  Gauge,
  GalleryHorizontal,
  BadgeCheck,
  MessageSquareText,
  Package,
  ReceiptText,
  ScrollText,
  ShoppingCart,
  Smartphone,
  Tags,
  Truck,
  Users,
  UserCog,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  /** Clé du compteur de travail en attente (vue d'ensemble). */
  badge?: 'ordersPending' | 'requestsNew' | 'reviewsPending' | 'repairsReady' | 'lowStock';
  exact?: boolean;
}

/** Écrans du quotidien, toujours visibles : le catalogue TitoTrade d'abord. */
export const PRIMARY_NAV: NavItem[] = [
  { href: '/', label: 'Accueil', icon: Gauge, exact: true },
  { href: '/produits', label: 'Produits', icon: Package, permission: 'catalog.read' },
  { href: '/categories', label: 'Catégories', icon: FolderTree, permission: 'catalog.write' },
  { href: '/marques', label: 'Marques', icon: BadgeCheck, permission: 'catalog.write' },
  { href: '/bannieres', label: 'Bannières', icon: GalleryHorizontal, permission: 'catalog.write' },
  { href: '/stocks', label: 'Stocks', icon: Boxes, permission: 'stock.read', badge: 'lowStock' },
  { href: '/vente', label: 'Caisse', icon: ShoppingCart, permission: 'orders.manage' },
  { href: '/statistiques', label: 'Statistiques', icon: BarChart3, permission: 'stats.read' },
  { href: '/parametres', label: 'Paramètres', icon: Cog, permission: 'settings.manage' },
];

/**
 * Écrans occasionnels, regroupés dans « Plus ».
 * Les modules hérités de TH Store (atelier de réparation, téléphones à l'unité suivis par IMEI) sont conservés
 * pour ne rien perdre, mais ne sont pas au cœur de TitoTrade.
 */
export const SECONDARY_NAV: NavItem[] = [
  { href: '/commandes', label: 'Ventes', icon: ReceiptText, permission: 'orders.read' },
  { href: '/approvisionnements', label: 'Approvisionnements', icon: Truck, permission: 'purchases.manage' },
  { href: '/fournisseurs', label: 'Fournisseurs', icon: ClipboardList, permission: 'suppliers.manage' },
  { href: '/clients', label: 'Clients', icon: Users, permission: 'customers.read' },
  { href: '/depenses', label: 'Dépenses', icon: Wallet, permission: 'expenses.manage' },
  { href: '/avis', label: 'Avis', icon: MessageSquareText, permission: 'reviews.moderate' },
  { href: '/occasions', label: 'Téléphones à l’unité (IMEI)', icon: Smartphone, permission: 'usedPhones.read' },
  { href: '/reparations', label: 'Réparations', icon: Wrench, permission: 'repairs.read', badge: 'repairsReady' },
  { href: '/tarifs', label: 'Tarifs de réparation', icon: Tags, permission: 'repairs.read' },
  { href: '/utilisateurs', label: 'Utilisateurs', icon: UserCog, permission: 'users.manage' },
  { href: '/journal', label: 'Journal', icon: ScrollText, permission: 'audit.read' },
];

export const QUICK_ACTIONS = [
  { href: '/produits/nouveau', label: 'Nouveau produit', permission: 'catalog.write', icon: Package },
  { href: '/vente', label: 'Nouvelle vente', permission: 'orders.manage', icon: ShoppingCart },
  { href: '/bannieres', label: 'Bannière d’accueil', permission: 'catalog.write', icon: GalleryHorizontal },
  { href: '/depenses?nouvelle=1', label: 'Dépense', permission: 'expenses.manage', icon: Wallet },
];
