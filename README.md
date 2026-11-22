# TitoTrade

Boutique en ligne de matériel électronique : smartphones, ordinateurs portables et de bureau, téléviseurs, écrans, périphériques et accessoires. Les clients commandent **par WhatsApp**, avec un message prérempli. Il n'y a pas de paiement en ligne.

Construit sur la base technique de **TH Store**. L'API, l'administration, le stock, la caisse et les statistiques sont réutilisés. Le site public est neuf.

| Dossier     | Rôle                                   | Technologie                         | Port local |
|-------------|----------------------------------------|-------------------------------------|-----------|
| `backend/`  | API REST, base de données              | NestJS 11, Prisma 6, PostgreSQL     | 4000 |
| `frontend/` | Site public TitoTrade                  | Next.js 15, React 19, Tailwind 4    | 3000 |
| `admin/`    | Administration (back-office)           | Next.js 15, React 19, Tailwind 4    | 3001 |

## Démarrage

```bash
pnpm install
pnpm db:start                         # PostgreSQL local, port 5436 (base « titotrade »)
cp backend/.env.example backend/.env  # puis renseigner APP_SECRET, DATA_ENCRYPTION_KEY, SEED_MANAGER_*
cp frontend/.env.example frontend/.env.local
cp admin/.env.example admin/.env.local
pnpm --filter @titotrade/backend db:deploy   # migrations
pnpm --filter @titotrade/backend db:seed     # catégories, marques, compte Responsable
pnpm --filter @titotrade/backend db:seed:demo   # facultatif : produits d'exemple
pnpm dev                              # API + site + administration
```

- Site public : http://localhost:3000
- Administration : http://localhost:3001 (compte `SEED_MANAGER_EMAIL` / `SEED_MANAGER_PASSWORD`)
- Pour retirer les produits d'exemple : `pnpm --filter @titotrade/backend db:demo:clear`

**Première configuration** : *Paramètres → Boutique*. Renseignez le **numéro WhatsApp des commandes** (avec l'indicatif pays). Sans lui, les boutons « Commander sur WhatsApp » restent désactivés.

Production : `pnpm build`, puis `pnpm --filter @titotrade/backend start:prod` (applique les migrations). Le fichier `render.yaml` décrit l'API sur Render ; `frontend/` et `admin/` se déploient sur Vercel.

Tests : `pnpm test` (54 tests, base `titotrade_test`).

## Variables d'environnement

Toutes les variables de TH Store sont conservées (voir `backend/.env.example`).

| Variable | Où | Rôle |
|----------|----|------|
| `DATABASE_URL` | backend | PostgreSQL. En local : `postgresql://titotrade@localhost:5436/titotrade` |
| `APP_SECRET`, `DATA_ENCRYPTION_KEY` | backend | Secrets (sessions, chiffrement) |
| `WEB_ORIGIN`, `ADMIN_ORIGIN`, `API_PUBLIC_URL` | backend | Adresses publiques |
| `CLOUDINARY_URL` | backend | Photos en production (vide = disque local) |
| **`CLOUDINARY_FOLDER`** *(nouvelle)* | backend | Dossier racine des photos dans Cloudinary, `titotrade` par défaut |
| `API_URL` | frontend, admin | URL de l'API (relais `/api`) |
| `NEXT_PUBLIC_SITE_URL` | frontend, admin | Adresse du site (SEO, lien envoyé dans WhatsApp) |

## Modèle de données ajouté (migration `titotrade_catalog`)

La migration ne fait qu'ajouter : rien n'est supprimé ni réécrit.

- **Product** : `brandId` (marque), `condition` (`NEW` / `USED` / `REFURBISHED`), `shortDescription`, `compareAtPrice` (ancien prix ; le pourcentage de réduction est calculé), `featured`, `specs` (JSON).
- **Category** : `specTemplate`, le gabarit de fiche technique (`SMARTPHONE`, `LAPTOP`, `DESKTOP`, `TV`, `MONITOR`, `ACCESSORY`, `PERIPHERAL`, `GENERIC`).
- **ProductVariant** (nouvelle table) : options (couleur, stockage, RAM, taille, modèle), référence, prix, ancien prix et stock facultatifs.
- **Banner** (nouvelle table) : bannières de l'accueil, avec photo, lien et période de diffusion.
- **BusinessSettings** : `topBarText` (bandeau), `aboutText` (présentation). Le nom par défaut devient « TitoTrade ».

Les caractéristiques techniques sont stockées en JSON. Les gabarits (`backend/src/catalog/spec-templates.ts`) ne font que proposer des champs. Ajouter un attribut ne demande donc **aucune migration**.

## Principales routes ajoutées

- **Public** :
  - `GET /shop/home`
  - `GET /shop/products` (filtres `category`, `brand`, `condition`, `group`, `minPrice`, `maxPrice`, `available`, `promo`, `q`, `order` ; facettes marques et états)
  - `GET /shop/products/:slug`
  - `GET /shop/banners`
  - `GET /shop/meta`
- **Admin** :
  - `POST|PATCH|DELETE /products/:id/variants…`
  - `DELETE /products/:id` (seulement une fiche sans historique ; sinon, archiver)
  - `DELETE /categories/:id`, `POST /categories/order`
  - `DELETE /brands/:id`
  - `/banners` (CRUD, photo, ordre)

## Système visuel du site

Structure « TH Store » : papier chaud, titres Newsreader, effets « liquid glass », en-tête flottant sans menu caché. Les accents viennent du logo TitoTrade.

Les jetons sont déclarés une seule fois dans `frontend/src/app/globals.css` (`@theme`), avec les utilitaires `glass`, `glass-light`, `glass-dark`, `display`, `eyebrow`, `num`, `reveal-word` et `container-page`.

- **Accent froid** : bleu roi du T, `#0058A4`.
- **Bleu nuit** : `#12203F`.
- **Accent chaud** : rose du ruban, assombri en `#B8395B` pour rester lisible (niveau AA).
- **Bouton WhatsApp** : `#188247`, qui assure le niveau AA avec un texte blanc.

Rubriques : Accueil · Conseil (assistant en 4 étapes) · Avis, plus la rubrique principale « Catalogue ». La page « La boutique » regroupe le contact, la carte et l'itinéraire.

## Message WhatsApp

```
Bonjour TitoTrade,

Je souhaite commander le produit suivant :

Produit : Samsung Galaxy A55 5G
Référence : DEMO-SAM-A55-01
Couleur : Bleu nuit
Stockage : 128 Go
Prix : 245 000 FCFA
Quantité : 1

Lien : https://…/produit/demo-sam-a55

Merci de me confirmer la disponibilité.
```

Lien `https://wa.me/<numéro>?text=…`, encodé avec `encodeURIComponent`. Il ouvre l'application sur mobile et WhatsApp Web sur ordinateur.
# tito
