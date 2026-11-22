/**
 * Données de référence TitoTrade (production comprise) :
 * catégories du catalogue (avec leur gabarit de fiche technique), marques, modèles courants
 * (compatibilités d'accessoires), paramètres par défaut, premier compte Responsable.
 *
 * Aucun produit, prix ni numéro de contact n'est créé ici : ces informations sont saisies
 * depuis l'administration (Paramètres → Boutique pour le numéro WhatsApp).
 * Les catégories de pièces et les types de panne de TH Store sont conservés pour le module atelier.
 * Le script est idempotent : il peut être relancé sans créer de doublons ni écraser les modifications.
 */
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const prisma = new PrismaClient();

const slugify = (v: string) =>
  v
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Catalogue TitoTrade : [nom, gabarit de fiche technique, description].
const CATALOG_CATEGORIES: [string, string, string][] = [
  ['Smartphones', 'SMARTPHONE', 'Téléphones et smartphones, neufs, d’occasion ou reconditionnés.'],
  ['Ordinateurs portables', 'LAPTOP', 'PC portables pour le travail, les études et le jeu.'],
  ['Ordinateurs de bureau', 'DESKTOP', 'Tours, mini PC et ordinateurs tout-en-un.'],
  ['Accessoires téléphoniques', 'ACCESSORY', 'Coques, chargeurs, câbles, écouteurs, batteries externes.'],
  ['Accessoires informatiques', 'ACCESSORY', 'Sacoches, hubs, adaptateurs, supports, stockage.'],
  ['Téléviseurs', 'TV', 'Smart TV et téléviseurs LED, QLED, OLED.'],
  ['Écrans et moniteurs', 'MONITOR', 'Moniteurs pour le bureau, le jeu et la création.'],
  ['Périphériques', 'PERIPHERAL', 'Claviers, souris, imprimantes, webcams, enceintes.'],
  ['Autres équipements', 'GENERIC', 'Tout le reste de l’électronique.'],
];

const PART_CATEGORIES = ['Écrans', 'Batteries de remplacement', 'Connecteurs de charge', 'Caméras', 'Haut-parleurs et micros', 'Vitres arrière et châssis', 'Autres pièces'];

// Marques de départ (modifiables depuis l'administration) et quelques modèles courants,
// utiles pour indiquer la compatibilité des accessoires.
const BRANDS: Record<string, string[]> = {
  Apple: ['iPhone 11', 'iPhone 12', 'iPhone 13', 'iPhone 14', 'iPhone 15', 'iPhone 15 Pro', 'iPhone 15 Pro Max', 'iPhone 16', 'iPhone 16 Pro', 'iPhone 16 Pro Max'],
  Samsung: ['Galaxy A15', 'Galaxy A25', 'Galaxy A35', 'Galaxy A55', 'Galaxy S23', 'Galaxy S24', 'Galaxy S24 Ultra'],
  Xiaomi: ['Xiaomi 13T', 'Xiaomi 14'],
  Redmi: ['Redmi 13C', 'Redmi Note 13', 'Redmi Note 13 Pro'],
  Tecno: ['Spark 20', 'Spark 20 Pro', 'Camon 30', 'Pova 6'],
  Infinix: ['Hot 40', 'Hot 40 Pro', 'Note 40', 'Zero 30'],
  HP: [],
  Dell: [],
  Lenovo: [],
  Asus: [],
  Acer: [],
  LG: [],
  TCL: [],
  Sony: [],
};

const REPAIR_TYPES: [string, string][] = [
  ['Écran cassé', 'Remplacement de l’écran ou de la vitre tactile.'],
  ['Batterie défectueuse', 'Autonomie faible, batterie gonflée ou qui se décharge vite.'],
  ['Connecteur de charge', 'Le téléphone ne charge plus ou seulement en tenant le câble.'],
  ['Caméra', 'Photo floue, caméra noire ou qui ne s’ouvre pas.'],
  ['Haut-parleur', 'Son faible, grésillements ou absence de son.'],
  ['Microphone', 'Votre correspondant ne vous entend pas.'],
  ['Téléphone qui ne s’allume plus', 'Diagnostic de la carte mère et de l’alimentation.'],
  ['Problème logiciel', 'Blocage, redémarrages, mise à jour ou réinitialisation.'],
  ['Autre panne', 'Décrivez le problème : nous établissons un diagnostic.'],
];

async function main() {
  // Paramètres : valeurs neutres ; coordonnées et numéro WhatsApp à renseigner dans l'administration.
  await prisma.businessSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      shopName: 'TitoTrade',
      tagline: 'Smartphones, ordinateurs, téléviseurs et accessoires',
      deliveryEnabled: false,
    },
  });

  for (const [position, [name, specTemplate, description]] of CATALOG_CATEGORIES.entries()) {
    const slug = slugify(name);
    await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug, kind: 'ACCESSORY', specTemplate, description, position } });
  }

  // Pièces détachées (atelier) : jamais publiées sur le site.
  for (const [position, name] of PART_CATEGORIES.entries()) {
    const slug = 'pieces-' + slugify(name);
    await prisma.category.upsert({ where: { slug }, update: {}, create: { name, slug, kind: 'PART', position } });
  }

  for (const [position, [brandName, models]] of Object.entries(BRANDS).entries()) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(brandName) },
      update: {},
      create: { name: brandName, slug: slugify(brandName), position },
    });
    for (const [mPos, name] of models.entries()) {
      await prisma.phoneModel.upsert({
        where: { brandId_slug: { brandId: brand.id, slug: slugify(name) } },
        update: {},
        create: { brandId: brand.id, name, slug: slugify(name), position: mPos },
      });
    }
  }

  const [smartphoneBrands, computerBrands, tvBrands] = await Promise.all([
    prisma.brand.findMany({ where: { slug: { in: ['apple', 'samsung', 'xiaomi', 'redmi', 'tecno', 'infinix'] } } }),
    prisma.brand.findMany({ where: { slug: { in: ['apple', 'hp', 'dell', 'lenovo', 'asus', 'acer', 'lg', 'sony'] } } }),
    prisma.brand.findMany({ where: { slug: { in: ['samsung', 'lg', 'tcl', 'sony'] } } }),
  ]);
  const categoryBrands: Array<[string, typeof smartphoneBrands]> = [
    ['smartphones', smartphoneBrands],
    ['accessoires-telephoniques', smartphoneBrands],
    ['ordinateurs-portables', computerBrands],
    ['ordinateurs-de-bureau', computerBrands],
    ['accessoires-informatiques', computerBrands],
    ['ecrans-et-moniteurs', computerBrands],
    ['peripheriques', computerBrands],
    ['televiseurs', tvBrands],
  ];
  for (const [slug, brands] of categoryBrands) {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (category) {
      await prisma.category.update({
        where: { id: category.id },
        data: { brands: { connect: brands.map((brand) => ({ id: brand.id })) } },
      });
    }
  }

  for (const [position, [name, description]] of REPAIR_TYPES.entries()) {
    await prisma.repairType.upsert({ where: { slug: slugify(name) }, update: {}, create: { name, slug: slugify(name), description, position } });
  }

  if ((await prisma.user.count()) === 0) {
    const email = process.env.SEED_MANAGER_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_MANAGER_PASSWORD;
    if (!email || !password || password.length < 10) {
      console.warn('⚠ Aucun utilisateur créé : définissez SEED_MANAGER_EMAIL et SEED_MANAGER_PASSWORD (10 caractères minimum).');
    } else {
      await prisma.user.create({
        data: {
          email,
          name: process.env.SEED_MANAGER_NAME?.trim() || 'Responsable',
          role: 'MANAGER',
          passwordHash: await hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
        },
      });
      console.log(`Compte Responsable créé : ${email} (changez le mot de passe après la première connexion).`);
    }
  }
  console.log('Données de référence en place.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
