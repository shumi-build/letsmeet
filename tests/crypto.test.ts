import { describe, expect, it } from 'vitest';
import { decryptJson, encryptJson, isPlanKey, newPlanKey } from '../app/src/lib/crypto';

describe('end-to-end encryption', () => {
  it('round-trips with the right key and context', async () => {
    const key = newPlanKey();
    expect(isPlanKey(key)).toBe(true);
    const box = await encryptJson(key, { n: 'Yuki', d: 'oomx' }, 'plan:resp');
    expect(box).not.toContain('Yuki');
    expect(await decryptJson(key, box, 'plan:resp')).toEqual({ n: 'Yuki', d: 'oomx' });
  });
  it('fails with a different key', async () => {
    const box = await encryptJson(newPlanKey(), { n: 'x' }, 'p:r');
    await expect(decryptJson(newPlanKey(), box, 'p:r')).rejects.toThrow();
  });
  it('fails if the server moves a box to another response or plan', async () => {
    const key = newPlanKey(), box = await encryptJson(key, { n: 'x' }, 'p:r1');
    await expect(decryptJson(key, box, 'p:r2')).rejects.toThrow();
  });
  it('uses a fresh IV every time', async () => {
    const key = newPlanKey();
    expect(await encryptJson(key, 1, 'c')).not.toBe(await encryptJson(key, 1, 'c'));
  });
});
