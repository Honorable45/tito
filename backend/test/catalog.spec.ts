import request from 'supertest';
import { createFixture, createProduct, CSRF, type Fixture } from './helpers';

jest.setTimeout(60_000);

let f: Fixture;
const pub = () => request(f.app.getHttpServer());

beforeAll(async () => {
  f = await createFixture();
});
afterAll(async () => {
  await f.app.close();
  await f.prisma.$disconnect();
});

describe('Catalogue TitoTrade', () => {
  it('crée un produit complet : marque, état, promotion, fiche technique', async () => {
    const res = await f.agents.manager
      .post('/products')
      .set(CSRF)
      .send({
        name: 'iPhone 13',
        categoryId: f.ids.accCategory,
        brandId: f.ids.brand,
        condition: 'REFURBISHED',
        salePrice: 330000,
        compareAtPrice: 360000,
        specs: [{ label: 'Stockage interne', value: '128 Go' }, { label: 'Vide', value: ' ' }],
      })
      .expect(201);
    expect(res.body.sku).toMatch(/^TT-[2-9A-Z]{6}$/);
    expect(res.body.discountPercent).toBe(8);
    expect(res.body.specs).toEqual([{ key: 'Stockage_interne', label: 'Stockage interne', value: '128 Go' }]);

    await f.agents.manager.post('/products').set(CSRF).send({ name: 'Promo incohérente', categoryId: f.ids.accCategory, salePrice: 1000, compareAtPrice: 900 }).expect(400);

    const list = await pub().get('/shop/products?brand=apple&condition=REFURBISHED').expect(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0]).toMatchObject({ name: 'iPhone 13', condition: 'REFURBISHED', compareAtPrice: 360000, brand: { slug: 'apple' } });
    expect(list.body.facets.brands).toEqual([expect.objectContaining({ slug: 'apple', count: 1 })]);
    expect(JSON.stringify(list.body)).not.toContain('averageCost');
  });

  it('gère des variantes avec leur prix et leur stock, sans doublon de combinaison', async () => {
    const p = await createProduct(f, { name: 'Galaxy A55', price: 245000, stock: 0, cost: 200000 });
    await f.agents.manager.post(`/products/${p.id}/variants`).set(CSRF).send({ options: { color: 'Noir', storage: '128 Go' }, stockQuantity: 2 }).expect(201);
    const two = await f.agents.manager.post(`/products/${p.id}/variants`).set(CSRF).send({ options: { color: 'Noir', storage: '256 Go' }, price: 285000, stockQuantity: 0 }).expect(201);
    expect(two.body.variants.map((v: { sku: string }) => v.sku)).toEqual([`${p.sku}-01`, `${p.sku}-02`]);
    await f.agents.manager.post(`/products/${p.id}/variants`).set(CSRF).send({ options: { color: 'noir', storage: '128 go' } }).expect(409);
    await f.agents.manager.post(`/products/${p.id}/variants`).set(CSRF).send({ options: { poids: '1 kg' } }).expect(400);
    await f.agents.seller.post(`/products/${p.id}/variants`).set(CSRF).send({ options: { color: 'Bleu' } }).expect(403);

    const slug = (await f.prisma.product.findUniqueOrThrow({ where: { id: p.id } })).slug;
    const detail = await pub().get(`/shop/products/${slug}`).expect(200);
    expect(detail.body.product.priceFrom).toBe(true);
    expect(detail.body.product.availability).toBe('LOW_STOCK');
    expect(detail.body.product.variantOptions.map((o: { key: string }) => o.key)).toEqual(['color', 'storage']);
    expect(detail.body.product.variants[1]).toMatchObject({ price: 285000, availability: 'OUT_OF_STOCK' });

    // Le stock déclaré d'une variante suffit à rendre le produit « disponible » dans le catalogue.
    const available = await pub().get('/shop/products?available=1&q=Galaxy').expect(200);
    expect(available.body.total).toBe(1);
  });

  it('supprime une fiche sans historique, archive sinon', async () => {
    const withStock = await createProduct(f, { name: 'Avec historique', price: 1000, stock: 1, cost: 500 });
    await f.agents.manager.delete(`/products/${withStock.id}`).set(CSRF).expect(409);
    const empty = await createProduct(f, { name: 'Sans historique', price: 1000, stock: 0, cost: 0 });
    await f.agents.manager.delete(`/products/${empty.id}`).set(CSRF).expect(204);
  });

  it('refuse de supprimer une catégorie ou une marque utilisée', async () => {
    await f.agents.manager.delete(`/categories/${f.ids.accCategory}`).set(CSRF).expect(409);
    await f.agents.manager.delete(`/brands/${f.ids.brand}`).set(CSRF).expect(409);
    const cat = await f.agents.manager.post('/categories').set(CSRF).send({ name: 'Consoles', specTemplate: 'GENERIC' }).expect(201);
    await f.agents.manager.delete(`/categories/${cat.body.id}`).set(CSRF).expect(204);
    await f.agents.manager.post('/categories').set(CSRF).send({ name: 'Tablettes', specTemplate: 'INCONNU' }).expect(400);
  });

  it('n’affiche une bannière qu’avec une photo, pendant sa période de diffusion', async () => {
    const b = await f.agents.manager.post('/banners').set(CSRF).send({ title: 'Promotions', linkUrl: '/catalogue?promo=1' }).expect(201);
    await f.agents.manager.patch(`/banners/${b.body.id}`).set(CSRF).send({ active: true }).expect(400);
    await f.agents.manager.post('/banners').set(CSRF).send({ title: 'Piège', linkUrl: 'javascript:alert(1)' }).expect(400);
    await f.prisma.banner.update({ where: { id: b.body.id }, data: { url: 'https://images.unsplash.com/photo-test' } });
    await f.agents.manager.patch(`/banners/${b.body.id}`).set(CSRF).send({ active: true }).expect(200);
    expect((await pub().get('/shop/banners').expect(200)).body).toHaveLength(1);
    await f.agents.manager.patch(`/banners/${b.body.id}`).set(CSRF).send({ endsAt: '2020-01-01T00:00:00Z' }).expect(200);
    expect((await pub().get('/shop/banners').expect(200)).body).toHaveLength(0);
  });

  it('classe les meilleures ventes d’après les ventes terminées', async () => {
    const before = await pub().get('/shop/home').expect(200);
    expect(before.body.bestSellers.source).toBe('featured');

    const p = await createProduct(f, { name: 'Chargeur 20 W', price: 6500, stock: 5, cost: 3000 });
    const order = await pub()
      .post('/shop/orders')
      .send({ customerName: 'Client', customerPhone: '+22890000009', fulfillment: 'PICKUP', paymentPreference: 'PAY_IN_STORE', items: [{ productId: p.id, quantity: 2 }] })
      .expect(201);
    const row = await f.prisma.order.findUniqueOrThrow({ where: { number: order.body.number } });
    await f.agents.manager.post(`/orders/${row.id}/status`).set(CSRF).send({ status: 'CONFIRMED' }).expect(200);
    await f.agents.manager.post(`/orders/${row.id}/payments`).set(CSRF).send({ kind: 'PAYMENT', amount: 13000, method: 'CASH' }).expect(201);
    await f.agents.manager.post(`/orders/${row.id}/status`).set(CSRF).send({ status: 'COMPLETED' }).expect(200);

    const after = await pub().get('/shop/home').expect(200);
    expect(after.body.bestSellers.source).toBe('sales');
    expect(after.body.bestSellers.items[0].id).toBe(p.id);
  });

  it('valide le numéro WhatsApp et publie le bandeau d’information', async () => {
    await f.agents.manager.put('/settings').set(CSRF).send({ whatsapp: 'pas un numéro' }).expect(400);
    await f.agents.manager.put('/settings').set(CSRF).send({ whatsapp: '+228 90 00 00 00', topBarText: 'Livraison à Lomé' }).expect(200);
    const s = await pub().get('/settings/public').expect(200);
    expect(s.body).toMatchObject({ whatsapp: '+228 90 00 00 00', topBarText: 'Livraison à Lomé' });
  });
});
