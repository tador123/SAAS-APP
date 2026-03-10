/**
 * Unit tests for CacheService.
 * Tests the in-memory fallback (no Redis required).
 */
describe('CacheService (in-memory fallback)', () => {
  let cacheService;

  beforeEach(() => {
    // Re-require to get a fresh instance
    jest.resetModules();
    cacheService = require('../../src/services/cacheService');
  });

  afterEach(async () => {
    await cacheService.flush();
  });

  it('should return null for missing keys', async () => {
    const result = await cacheService.get('nonexistent');
    expect(result).toBeNull();
  });

  it('should set and get values', async () => {
    await cacheService.set('test-key', { foo: 'bar' }, 60);
    const result = await cacheService.get('test-key');
    expect(result).toEqual({ foo: 'bar' });
  });

  it('should delete keys', async () => {
    await cacheService.set('to-delete', 'value', 60);
    await cacheService.del('to-delete');
    const result = await cacheService.get('to-delete');
    expect(result).toBeNull();
  });

  it('should support wildcard deletion', async () => {
    await cacheService.set('prefix:a', 1, 60);
    await cacheService.set('prefix:b', 2, 60);
    await cacheService.set('other:c', 3, 60);

    await cacheService.del('prefix:*');

    expect(await cacheService.get('prefix:a')).toBeNull();
    expect(await cacheService.get('prefix:b')).toBeNull();
    expect(await cacheService.get('other:c')).toBe(3);
  });

  it('should expire entries after TTL', async () => {
    // Set with 1 second TTL
    await cacheService.set('expiring', 'value', 1);
    expect(await cacheService.get('expiring')).toBe('value');

    // Wait for expiry
    await new Promise(resolve => setTimeout(resolve, 1100));
    expect(await cacheService.get('expiring')).toBeNull();
  });

  it('should flush all entries', async () => {
    await cacheService.set('a', 1, 60);
    await cacheService.set('b', 2, 60);
    await cacheService.flush();

    expect(await cacheService.get('a')).toBeNull();
    expect(await cacheService.get('b')).toBeNull();
  });
});
