import { hashEmail, hashName, hashPhone, sha256 } from './hash.helper';

describe('hash.helper', () => {
  describe('sha256', () => {
    it('produz hex de 64 chars', () => {
      expect(sha256('abc')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('valor canônico do FIPS 180-2 ("abc")', () => {
      expect(sha256('abc')).toBe(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );
    });
  });

  describe('hashEmail', () => {
    it('lower + trim antes do hash', () => {
      const a = hashEmail('  Joe@Example.COM  ');
      const b = hashEmail('joe@example.com');
      expect(a).toBe(b);
    });

    it('valor canônico Meta docs ("joe@eg.com" lowercased+trimmed)', () => {
      // Meta docs reference value: SHA-256 of "joe@eg.com"
      expect(hashEmail('joe@eg.com')).toBe(sha256('joe@eg.com'));
      expect(hashEmail('  JOE@eg.com  ')).toBe(sha256('joe@eg.com'));
    });
  });

  describe('hashPhone', () => {
    it('só dígitos antes do hash', () => {
      const a = hashPhone('+55 (11) 9 9999-9999');
      const b = hashPhone('5511999999999');
      expect(a).toBe(b);
    });

    it('phone vazio (sem dígitos) ainda hasheia (string vazia)', () => {
      expect(hashPhone('+++ ()')).toBe(sha256(''));
    });
  });

  describe('hashName', () => {
    it('lower + trim antes do hash', () => {
      expect(hashName('  Maria  ')).toBe(hashName('maria'));
    });

    it('preserva acento (UTF-8)', () => {
      // Meta aceita UTF-8 — não normalizamos acento.
      expect(hashName('José')).toBe(sha256('josé'));
      expect(hashName('José')).not.toBe(sha256('jose'));
    });
  });
});
