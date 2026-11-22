/**
 * DONNÉES DE DÉMONSTRATION — environnement de développement uniquement.
 *
 * Tous les produits créés ici sont marqués `isDemo` : le site les signale par un badge « Exemple »
 * et un bandeau « catalogue d'exemple ». Prix et stocks sont fictifs. Les photos proviennent
 * d'Unsplash (licence libre) et illustrent le type de produit, pas un article réellement en stock.
 * Les comptes de démonstration portent le domaine « demo.titotrade.local ».
 *
 *   pnpm db:seed:demo     → crée les données
 *   pnpm db:demo:clear    → retire les données de démonstration
 *
 * Refuse de s'exécuter si NODE_ENV=production.
 */
import { Prisma, PrismaClient, ProductCondition } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();
const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}`;
const DEMO_PASSWORD = 'Demo-titotrade-2026';
const DEMO_DOMAIN = '@demo.titotrade.local';

type Spec = [key: string, label: string, value: string];
type Variant = { options: Record<string, string>; price?: number; compareAt?: number; stock?: number };

type DemoProduct = {
  sku: string;
  name: string;
  category: string;
  brand?: string;
  condition?: ProductCondition;
  price: number;
  compareAt?: number;
  cost: number;
  stock: number;
  images: [id: string, alt: string][];
  short: string;
  description: string;
  specs: Spec[];
  variants?: Variant[];
  featured?: boolean;
};

const NOTE = 'Fiche d’exemple : prix, stock et caractéristiques fictifs, à remplacer par vos produits.';

const PRODUCTS: DemoProduct[] = [
  {
    sku: 'DEMO-SAM-A55', name: 'Samsung Galaxy A55 5G', category: 'smartphones', brand: 'samsung', price: 245000, compareAt: 275000, cost: 205000, stock: 6, featured: true,
    images: [['1598327105666-5b89351aff97', 'Smartphone Android, écran allumé']],
    short: 'Écran Super AMOLED 6,6", 5G, triple capteur 50 Mpx.',
    description: 'Un milieu de gamme complet : grand écran lumineux, autonomie confortable et mises à jour longues.',
    specs: [['model', 'Modèle', 'Galaxy A55 5G'], ['ram', 'Mémoire RAM', '8 Go'], ['storage', 'Stockage interne', '128 / 256 Go'], ['screenSize', "Taille de l'écran", '6,6 pouces'], ['resolution', 'Résolution', '1080 × 2340'], ['processor', 'Processeur', 'Exynos 1480'], ['battery', 'Capacité de la batterie', '5000 mAh'], ['camera', 'Appareil photo', '50 + 12 + 5 Mpx'], ['os', "Système d'exploitation", 'Android 14'], ['colors', 'Couleurs disponibles', 'Bleu nuit, Noir'], ['connectivity', 'Connectivité', '5G, Wi‑Fi 6, Bluetooth 5.3, NFC, double SIM']],
    variants: [
      { options: { color: 'Bleu nuit', storage: '128 Go' }, price: 245000, compareAt: 275000, stock: 3 },
      { options: { color: 'Noir', storage: '128 Go' }, price: 245000, compareAt: 275000, stock: 2 },
      { options: { color: 'Noir', storage: '256 Go' }, price: 285000, stock: 1 },
      { options: { color: 'Bleu nuit', storage: '256 Go' }, price: 285000, stock: 0 },
    ],
  },
  {
    sku: 'DEMO-IPH-13', name: 'Apple iPhone 13', category: 'smartphones', brand: 'apple', condition: 'REFURBISHED', price: 330000, cost: 280000, stock: 4, featured: true,
    images: [['1511707171634-5f897ff02aa9', 'iPhone posé sur un bureau blanc']],
    short: 'Reconditionné, batterie ≥ 85 %, garantie 6 mois.',
    description: 'Contrôlé point par point : écran, Face ID, caméras, charge, réseau. Livré nettoyé avec câble.',
    specs: [['model', 'Modèle', 'iPhone 13'], ['storage', 'Stockage interne', '128 / 256 Go'], ['screenSize', "Taille de l'écran", '6,1 pouces'], ['resolution', 'Résolution', '1170 × 2532'], ['processor', 'Processeur', 'A15 Bionic'], ['camera', 'Appareil photo', '12 + 12 Mpx'], ['os', "Système d'exploitation", 'iOS 17'], ['connectivity', 'Connectivité', '5G, Wi‑Fi 6, Bluetooth 5.0, NFC']],
    variants: [
      { options: { color: 'Minuit', storage: '128 Go' }, price: 330000 },
      { options: { color: 'Minuit', storage: '256 Go' }, price: 380000 },
    ],
  },
  {
    sku: 'DEMO-IPH-11P', name: 'Apple iPhone 11 Pro 256 Go', category: 'smartphones', brand: 'apple', condition: 'USED', price: 210000, cost: 170000, stock: 1,
    images: [['1592750475338-74b7b21085ab', 'iPhone gris sidéral, vue de dos'], ['1574944985070-8f3ebc6b79d2', 'iPhone argent, détail du bloc photo']],
    short: 'Occasion, très bon état, batterie 84 %.',
    description: 'Micro-rayures invisibles écran allumé. Testé en atelier.',
    specs: [['model', 'Modèle', 'iPhone 11 Pro'], ['storage', 'Stockage interne', '256 Go'], ['screenSize', "Taille de l'écran", '5,8 pouces'], ['camera', 'Appareil photo', 'Triple 12 Mpx'], ['battery', 'Capacité de la batterie', 'Santé 84 %'], ['os', "Système d'exploitation", 'iOS 17']],
  },
  {
    sku: 'DEMO-TEC-C30', name: 'Tecno Camon 30', category: 'smartphones', brand: 'tecno', price: 155000, cost: 128000, stock: 9,
    images: [['1601784551446-20c9e07cdbdb', 'Smartphone noir, écran d’accueil allumé']],
    short: '12 + 256 Go, charge rapide 70 W.',
    description: 'Grand écran AMOLED et charge très rapide.',
    specs: [['model', 'Modèle', 'Camon 30'], ['ram', 'Mémoire RAM', '12 Go'], ['storage', 'Stockage interne', '256 Go'], ['screenSize', "Taille de l'écran", '6,78 pouces'], ['battery', 'Capacité de la batterie', '5000 mAh'], ['os', "Système d'exploitation", 'Android 14']],
  },
  {
    sku: 'DEMO-DEL-7420', name: 'Dell Latitude 7420', category: 'ordinateurs-portables', brand: 'dell', condition: 'REFURBISHED', price: 265000, cost: 210000, stock: 5,
    images: [['1588872657578-7efd1f1555ed', 'Ordinateur portable Dell ouvert sur fond clair']],
    short: 'Core i5 11e gén., écran 14" Full HD, Windows 11.',
    description: 'Portable professionnel léger et robuste, reconditionné et testé.',
    specs: [['model', 'Modèle', 'Latitude 7420'], ['processor', 'Processeur', 'Intel Core i5-1145G7'], ['cpuGeneration', 'Génération du processeur', '11e génération'], ['ram', 'Mémoire RAM', '8 / 16 Go'], ['storage', 'Stockage (SSD / HDD)', 'SSD 256 / 512 Go'], ['screenSize', "Taille de l'écran", '14 pouces Full HD'], ['gpu', 'Carte graphique', 'Intel Iris Xe'], ['os', "Système d'exploitation", 'Windows 11 Pro'], ['batteryHealth', 'État de la batterie', '88 %']],
    variants: [
      { options: { ram: '8 Go', storage: 'SSD 256 Go' }, price: 265000 },
      { options: { ram: '16 Go', storage: 'SSD 512 Go' }, price: 310000 },
    ],
  },
  {
    sku: 'DEMO-MBP-M1', name: 'Apple MacBook Pro 13" M1', category: 'ordinateurs-portables', brand: 'apple', condition: 'USED', price: 520000, cost: 450000, stock: 2, featured: true,
    images: [['1496181133206-80ce9b88a853', 'MacBook Pro ouvert sur un meuble en bois'], ['1517336714731-489689fd1ca8', 'MacBook Pro, clavier sous lumière violette']],
    short: 'Puce M1, 8 Go, SSD 256 Go, 142 cycles de batterie.',
    description: 'Silencieux, très autonome, idéal pour le travail et les études.',
    specs: [['model', 'Modèle', 'MacBook Pro 13" (2020)'], ['processor', 'Processeur', 'Apple M1'], ['ram', 'Mémoire RAM', '8 Go'], ['storage', 'Stockage (SSD / HDD)', 'SSD 256 Go'], ['screenSize', "Taille de l'écran", '13,3 pouces Retina'], ['os', "Système d'exploitation", 'macOS Sonoma'], ['batteryHealth', 'État de la batterie', '91 % — 142 cycles']],
  },
  {
    sku: 'DEMO-IMAC-24', name: 'Apple iMac 24"', category: 'ordinateurs-de-bureau', brand: 'apple', price: 950000, cost: 850000, stock: 1,
    images: [['1527443224154-c4a3942d3acf', 'iMac blanc avec clavier sur un bureau']],
    short: 'Tout-en-un, écran Retina 4,5K.',
    description: 'Ordinateur tout-en-un fin, avec clavier et souris.',
    specs: [['model', 'Modèle', 'iMac 24" (2023)'], ['processor', 'Processeur', 'Apple M3'], ['ram', 'Mémoire RAM', '8 Go'], ['storage', 'Stockage (SSD / HDD)', 'SSD 256 Go'], ['os', "Système d'exploitation", 'macOS'], ['formFactor', 'Format', 'Tout-en-un']],
  },
  {
    sku: 'DEMO-PC-GAME', name: 'PC de bureau gaming Ryzen 7 / RTX 4060', category: 'ordinateurs-de-bureau', price: 780000, compareAt: 840000, cost: 690000, stock: 2,
    images: [['1593640408182-31c70c8268f5', 'Tour de PC gaming éclairée à côté d’un écran']],
    short: 'Montage sur mesure, 32 Go de RAM, SSD 1 To.',
    description: 'Configuration assemblée et testée en boutique, idéale pour le jeu et le montage vidéo.',
    specs: [['processor', 'Processeur', 'AMD Ryzen 7 7700'], ['ram', 'Mémoire RAM', '32 Go DDR5'], ['storage', 'Stockage (SSD / HDD)', 'SSD NVMe 1 To'], ['gpu', 'Carte graphique', 'NVIDIA RTX 4060 8 Go'], ['os', "Système d'exploitation", 'Windows 11'], ['formFactor', 'Format', 'Tour']],
  },
  {
    sku: 'DEMO-SAM-TV', name: 'Samsung Smart TV Crystal UHD 4K', category: 'televiseurs', brand: 'samsung', price: 245000, compareAt: 270000, cost: 205000, stock: 6, featured: true,
    images: [['1593784991095-a205069470b6', 'Téléviseur Samsung, écran d’accueil Smart TV']],
    short: 'Smart TV 4K, Tizen, HDR10+.',
    description: 'Image 4K nette, applications de streaming intégrées.',
    specs: [['model', 'Modèle', 'Crystal UHD CU7000'], ['screenSize', 'Taille (pouces)', '43 / 55 / 65 pouces'], ['resolution', 'Résolution', '4K UHD (3840 × 2160)'], ['panel', "Technologie d'écran", 'LED'], ['smartTv', 'Smart TV', 'Oui — Tizen'], ['connectivity', 'Connectivité', '3 HDMI, 1 USB, Wi‑Fi, Bluetooth'], ['screenType', "Type d'écran", 'Plat']],
    variants: [
      { options: { size: '43 pouces' }, price: 245000, compareAt: 270000, stock: 3 },
      { options: { size: '55 pouces' }, price: 365000, compareAt: 399000, stock: 2 },
      { options: { size: '65 pouces' }, price: 520000, stock: 1 },
    ],
  },
  {
    sku: 'DEMO-TCL-50', name: 'TCL 50" 4K Google TV', category: 'televiseurs', brand: 'tcl', price: 215000, cost: 180000, stock: 4,
    images: [['1461151304267-38535e780c79', 'Téléviseur sur un meuble blanc dans un salon']],
    short: '4K HDR, Google TV, Dolby Audio.',
    description: 'Un grand écran 4K au meilleur prix.',
    specs: [['screenSize', 'Taille (pouces)', '50 pouces'], ['resolution', 'Résolution', '4K UHD'], ['panel', "Technologie d'écran", 'LED'], ['smartTv', 'Smart TV', 'Oui — Google TV'], ['connectivity', 'Connectivité', '3 HDMI, 2 USB, Wi‑Fi']],
  },
  {
    sku: 'DEMO-LG-43', name: 'LG Smart TV 43" Full HD', category: 'televiseurs', brand: 'lg', price: 189000, cost: 158000, stock: 0,
    images: [['1593359677879-a4bb92f829d1', 'Téléviseur affichant des applications de streaming']],
    short: 'webOS, Full HD, compact.',
    description: 'Idéal pour une chambre ou un petit salon.',
    specs: [['screenSize', 'Taille (pouces)', '43 pouces'], ['resolution', 'Résolution', 'Full HD 1080p'], ['smartTv', 'Smart TV', 'Oui — webOS']],
  },
  {
    sku: 'DEMO-ASU-27', name: 'Écran Asus 27" IPS QHD', category: 'ecrans-et-moniteurs', brand: 'asus', price: 145000, cost: 118000, stock: 3,
    images: [['1587831990711-23ca6441447b', 'Moniteur sur un bureau avec clavier mécanique']],
    short: '2560 × 1440, 75 Hz, bords fins.',
    description: 'Dalle IPS aux couleurs fidèles, pour le bureau comme pour les loisirs.',
    specs: [['screenSize', 'Taille (pouces)', '27 pouces'], ['resolution', 'Résolution', '2560 × 1440'], ['panel', 'Dalle', 'IPS'], ['refreshRate', 'Fréquence', '75 Hz'], ['connectivity', 'Connectivité', 'HDMI, DisplayPort']],
  },
  {
    sku: 'DEMO-KBD-MAG', name: 'Apple Magic Keyboard', category: 'peripheriques', brand: 'apple', price: 65000, cost: 52000, stock: 4,
    images: [['1587829741301-dc798b83add3', 'Clavier blanc sans fil, vue de dessus']],
    short: 'Clavier sans fil rechargeable, AZERTY.',
    description: 'Fin, silencieux et rechargeable en USB‑C.',
    specs: [['compatibility', 'Compatibilité', 'Mac, iPad'], ['connection', 'Type de connexion', 'Bluetooth'], ['color', 'Couleur', 'Blanc']],
  },
  {
    sku: 'DEMO-MOU-ERG', name: 'Souris sans fil silencieuse', category: 'peripheriques', price: 9500, cost: 5500, stock: 15,
    images: [['1615663245857-ac93bb7c39e7', 'Souris noire sur fond sombre']],
    short: 'Clic silencieux, récepteur USB 2,4 GHz.',
    description: 'Souris légère pour le bureau et les déplacements.',
    specs: [['connection', 'Type de connexion', 'Sans fil 2,4 GHz'], ['color', 'Couleur', 'Noir']],
  },
  {
    sku: 'DEMO-ECO-BT', name: 'Écouteurs sans fil Bluetooth', category: 'accessoires-telephoniques', price: 15000, compareAt: 18000, cost: 9000, stock: 12,
    images: [['1639521234037-8160317e81d9', 'Écouteurs sans fil et leur boîtier à côté d’un smartphone']],
    short: 'Bluetooth 5.3, boîtier de charge.',
    description: 'Jusqu’à 5 heures d’écoute, 20 heures avec le boîtier.',
    specs: [['compatibility', 'Compatibilité', 'Android et iPhone'], ['connection', 'Type de connexion', 'Bluetooth 5.3'], ['features', 'Caractéristiques particulières', 'Micro intégré, commandes tactiles']],
  },
  {
    sku: 'DEMO-CHG-20W', name: 'Chargeur secteur USB‑C 20 W', category: 'accessoires-telephoniques', price: 6500, cost: 3800, stock: 25,
    images: [['1583863788434-e58a36330cf0', 'Chargeur secteur blanc et son câble']],
    short: 'Charge rapide Power Delivery.',
    description: 'Compatible avec la plupart des smartphones récents.',
    specs: [['compatibility', 'Compatibilité', 'iPhone, Samsung, Android USB‑C'], ['connection', 'Type de connexion', 'USB‑C'], ['color', 'Couleur', 'Blanc']],
  },
  {
    sku: 'DEMO-BAT-10K', name: 'Batterie externe 10 000 mAh', category: 'accessoires-telephoniques', price: 12000, cost: 7500, stock: 8,
    images: [['1760708825913-65a50b3dc39b', 'Batterie externe blanche avec trois câbles']],
    short: 'Trois câbles intégrés.',
    description: 'Câbles USB‑C, Lightning et micro‑USB intégrés. Recharge environ deux smartphones.',
    specs: [['connection', 'Type de connexion', 'USB‑C, Lightning, micro‑USB'], ['features', 'Caractéristiques particulières', 'Écran de niveau de charge']],
  },
  {
    sku: 'DEMO-CAB-CC', name: 'Câble USB‑C tressé', category: 'accessoires-telephoniques', price: 3000, cost: 1400, stock: 40,
    images: [['1595756630452-736bc8ef3693', 'Câble tressé noir enroulé']],
    short: 'Gaine en nylon, charge rapide 60 W.',
    description: 'Embouts renforcés, charge et transfert de données.',
    specs: [['connection', 'Type de connexion', 'USB‑C vers USB‑C'], ['color', 'Couleur', 'Noir']],
    variants: [
      { options: { size: '1 m' }, price: 3000 },
      { options: { size: '2 m' }, price: 4000 },
    ],
  },
  {
    sku: 'DEMO-CSQ-SONY', name: 'Casque Bluetooth Sony', category: 'accessoires-informatiques', brand: 'sony', price: 35000, cost: 26000, stock: 3,
    images: [['1550009158-9ebf69173e03', 'Casque Sony noir posé sur un clavier']],
    short: 'Jusqu’à 35 h d’autonomie, pliable.',
    description: 'Casque léger pour le télétravail et la musique.',
    specs: [['connection', 'Type de connexion', 'Bluetooth, jack 3,5 mm'], ['color', 'Couleur', 'Noir'], ['features', 'Caractéristiques particulières', 'Micro intégré']],
  },
  {
    sku: 'DEMO-IPAD-10', name: 'Apple iPad 10,2"', category: 'autres-equipements', brand: 'apple', condition: 'REFURBISHED', price: 230000, cost: 190000, stock: 2,
    images: [['1544244015-0df4b3ffc6b0', 'iPad et son stylet posés sur une table sombre']],
    short: 'Tablette reconditionnée, 64 Go, Wi‑Fi.',
    description: 'Pour la lecture, les cours et les vidéos.',
    specs: [['model', 'Modèle', 'iPad 9e génération'], ['storage', 'Stockage', '64 Go'], ['screenSize', "Taille de l'écran", '10,2 pouces']],
  },
];

const BANNERS = [
  { title: 'Smartphones neufs et reconditionnés', subtitle: 'Samsung, Apple, Tecno… choisissez, puis commandez en un message WhatsApp.', image: '1691449808001-bb8c157f0094', alt: 'Smartphone, écouteurs et stylet sur une table grise', link: '/categorie/smartphones', cta: 'Voir les smartphones' },
  { title: 'Ordinateurs pour le travail et les études', subtitle: 'Portables et PC de bureau testés, prêts à l’emploi.', image: '1498049794561-7780e7231661', alt: 'Bureau avec ordinateur portable, casque et smartphone', link: '/categorie/ordinateurs-portables', cta: 'Voir les ordinateurs' },
  { title: 'Téléviseurs 4K', subtitle: 'Smart TV de 43 à 65 pouces.', image: '1593359677879-a4bb92f829d1', alt: 'Téléviseur affichant des applications de streaming', link: '/categorie/televiseurs', cta: 'Voir les téléviseurs' },
];

async function clear() {
  const demoProducts = await prisma.product.findMany({
    where: { isDemo: true },
    include: { _count: { select: { orderItems: true, repairParts: true, purchaseItems: true } } },
  });
  let archived = 0;
  for (const p of demoProducts) {
    if (p._count.orderItems || p._count.repairParts || p._count.purchaseItems) {
      // Des opérations y font référence : on archive au lieu de supprimer (traçabilité).
      await prisma.product.update({ where: { id: p.id }, data: { status: 'ARCHIVED', published: false } });
      archived++;
    } else {
      await prisma.$transaction([
        prisma.inventoryMovement.deleteMany({ where: { productId: p.id } }),
        prisma.inventoryCountLine.deleteMany({ where: { productId: p.id } }),
        prisma.product.delete({ where: { id: p.id } }),
      ]);
    }
  }
  // Anciennes données de démonstration TH Store éventuelles (téléphones à l'unité, tarifs de réparation).
  const phones = await prisma.usedPhone.findMany({ where: { isDemo: true }, include: { _count: { select: { orderItems: true } } } });
  for (const ph of phones) {
    if (ph._count.orderItems) await prisma.usedPhone.update({ where: { id: ph.id }, data: { status: 'ARCHIVED' } });
    else await prisma.usedPhone.delete({ where: { id: ph.id } });
  }
  await prisma.repairPrice.deleteMany({ where: { isDemo: true } });
  // Les bannières de démonstration utilisent des photos externes ; celles de l'administration sont téléversées.
  const { count: banners } = await prisma.banner.deleteMany({ where: { url: { startsWith: 'https://images.unsplash.com/' } } });
  await prisma.user.updateMany({ where: { email: { endsWith: DEMO_DOMAIN } }, data: { active: false } });
  console.log(`Démo retirée : ${demoProducts.length - archived} produit(s) supprimé(s), ${archived} archivé(s), ${banners} bannière(s).`);
}

async function seed() {
  const [brands, categories] = await Promise.all([prisma.brand.findMany(), prisma.category.findMany()]);
  const brandId = (slug?: string) => {
    if (!slug) return null;
    const b = brands.find((x) => x.slug === slug);
    if (!b) throw new Error(`Marque absente : ${slug}. Lancez d'abord « pnpm db:seed ».`);
    return b.id;
  };
  const categoryId = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    if (!c) throw new Error(`Catégorie absente : ${slug}. Lancez d'abord « pnpm db:seed ».`);
    return c.id;
  };

  const supplier =
    (await prisma.supplier.findFirst({ where: { name: 'Fournisseur de démonstration' } })) ??
    (await prisma.supplier.create({ data: { name: 'Fournisseur de démonstration', notes: 'Créé par le script de démonstration.' } }));

  let created = 0;
  for (const p of PRODUCTS) {
    if (await prisma.product.findUnique({ where: { sku: p.sku } })) continue;
    const product = await prisma.product.create({
      data: {
        kind: 'ACCESSORY',
        sku: p.sku,
        slug: p.sku.toLowerCase(),
        name: p.name,
        shortDescription: p.short,
        description: `${p.description}\n\n${NOTE}`,
        categoryId: categoryId(p.category),
        brandId: brandId(p.brand),
        condition: p.condition ?? 'NEW',
        specs: p.specs.map(([key, label, value]) => ({ key, label, value })) as Prisma.InputJsonValue,
        supplierId: supplier.id,
        salePrice: p.price,
        compareAtPrice: p.compareAt ?? null,
        featured: p.featured ?? false,
        averageCost: p.cost,
        stockQuantity: p.stock,
        lowStockThreshold: 2,
        published: true,
        isDemo: true,
        images: { create: p.images.map(([id, alt], position) => ({ url: unsplash(id), alt, width: 1600, height: 1600, position })) },
        variants: p.variants
          ? {
              create: p.variants.map((v, position) => ({
                sku: `${p.sku}-${String(position + 1).padStart(2, '0')}`,
                options: v.options,
                price: v.price ?? null,
                compareAtPrice: v.compareAt ?? null,
                stockQuantity: v.stock ?? null,
                position,
              })),
            }
          : undefined,
      },
    });
    if (p.stock > 0) {
      await prisma.inventoryMovement.create({
        data: { productId: product.id, type: 'INITIAL', quantity: p.stock, unitCost: p.cost, stockAfter: p.stock, averageCostAfter: p.cost, reason: 'Stock initial (démonstration)' },
      });
    }
    created++;
  }

  for (const [position, b] of BANNERS.entries()) {
    const url = unsplash(b.image);
    if (await prisma.banner.findFirst({ where: { url } })) continue;
    await prisma.banner.create({ data: { title: b.title, subtitle: b.subtitle, url, imageAlt: b.alt, linkUrl: b.link, ctaLabel: b.cta, position, active: true } });
  }

  const passwordHash = await hash(DEMO_PASSWORD, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  for (const [email, name, role] of [
    [`vendeur${DEMO_DOMAIN}`, 'Vendeur démo', 'SELLER'],
    [`technicien${DEMO_DOMAIN}`, 'Technicien démo', 'TECHNICIAN'],
  ] as const) {
    await prisma.user.upsert({ where: { email }, update: { active: true }, create: { email, name, role, passwordHash } });
  }

  console.log(`Données de démonstration : ${created} produit(s) créé(s), bannières en place.`);
  console.log(`Comptes : vendeur${DEMO_DOMAIN} / technicien${DEMO_DOMAIN} — mot de passe : ${DEMO_PASSWORD}`);
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusé : les données de démonstration ne doivent pas être créées en production.');
  }
  if (process.argv.includes('--clear')) await clear();
  else await seed();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
