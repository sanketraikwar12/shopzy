import request from 'supertest';
import { Shop } from '../src/models';
import { API, auth, clearCache, createUserAndSignIn, getApp, seedShop } from './helpers';

beforeEach(clearCache);

describe('PUT /shops/:id — location & address persistence', () => {
  it('updates address, landmark, and pincode without changing coordinates', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const initialCoords: [number, number] = [77.4126, 23.2599];
    const shop = await seedShop(String(user._id), {
      slug: 'address-test-shop',
      coordinates: initialCoords,
    });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({
        address: 'New Market Road, Shop 42',
        landmark: 'Near Top N Town',
        pincode: '462003',
      });

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.location.address).toBe('New Market Road, Shop 42');
    expect(fresh!.location.landmark).toBe('Near Top N Town');
    expect(fresh!.location.pincode).toBe('462003');
    // Original coordinates and city must be preserved intact
    expect(fresh!.location.coordinates).toEqual(initialCoords);
    expect(fresh!.location.city).toBe('Bhopal');
  });

  it('updates coordinates when both lat and lng are provided', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), {
      slug: 'coords-test-shop',
      coordinates: [77.4126, 23.2599],
    });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({
        lat: 23.2332,
        lng: 77.4348,
      });

    expect(res.status).toBe(200);

    const fresh = await Shop.findById(shop._id).lean();
    expect(fresh!.location.coordinates).toEqual([77.4348, 23.2332]);
  });

  it('rejects an update when only lat or lng is provided', async () => {
    const { user, token } = await createUserAndSignIn('owner');
    const shop = await seedShop(String(user._id), { slug: 'single-coord-shop' });

    const res = await request(getApp())
      .put(`${API}/shops/${shop._id}`)
      .set(auth(token))
      .send({ lat: 23.2332 });

    expect(res.status).toBe(422);
  });
});
