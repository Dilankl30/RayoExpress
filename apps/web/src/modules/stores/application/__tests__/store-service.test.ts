import { describe, it, expect, vi } from 'vitest';

const mockSupabaseReady = vi.hoisted(() => ({ value: false }));
const mockGetSupabase = vi.hoisted(() => vi.fn());

vi.mock('../../../../integrations/supabase/client', () => ({
  get isSupabaseReady() { return mockSupabaseReady.value; },
  getSupabase: mockGetSupabase,
}));

import { getStores, getCategories, getProductsByStore } from '../store-service';

describe('getStores', () => {
  it('returns store data', async () => {
    const stores = await getStores();
    expect(Array.isArray(stores)).toBe(true);
    expect(stores.length).toBeGreaterThan(0);
    expect(stores[0]).toHaveProperty('id');
    expect(stores[0]).toHaveProperty('name');
  });
});

describe('getCategories', () => {
  it('returns category data', async () => {
    const categories = await getCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty('id');
    expect(categories[0]).toHaveProperty('name');
  });
});

describe('getProductsByStore', () => {
  it('returns products for a valid store id', async () => {
    const products = await getProductsByStore('store-1');
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBeGreaterThan(0);
    expect(products[0].store_id).toBe('store-1');
  });

  it('returns empty array for an invalid store id', async () => {
    const products = await getProductsByStore('non-existent');
    expect(Array.isArray(products)).toBe(true);
    expect(products.length).toBe(0);
  });
});

describe('error handling', () => {
  it('throws when supabase fails', async () => {
    mockSupabaseReady.value = true;
    const mockOrder = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
    const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
    mockGetSupabase.mockReturnValue({ from: () => ({ select: mockSelect }) });
    await expect(getStores()).rejects.toThrow('DB error');
    mockSupabaseReady.value = false;
  });
});
