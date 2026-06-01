/**
 * Encryption Utility Tests
 *
 * Covers AES-256-GCM encryption / decryption for OAuth token storage:
 * - encrypt returns a string with the expected format
 * - decrypt(encrypt(text)) round-trips to original text
 * - Different calls produce different ciphertext (IV uniqueness)
 * - Tampered ciphertext returns original (graceful degradation)
 * - Empty string round-trips
 * - isEncrypted detects encrypted format
 * - encryptJson / decryptJson for structured data
 * - Graceful degradation when TOKEN_ENCRYPTION_KEY is not set
 *
 * Run:  npx vitest run screencold-web/tests/lib/encryption.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set a deterministic 64-char hex key for testing
const TEST_KEY_HEX = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';

// ============================================
// Tests WITH encryption key configured
// ============================================

describe('encryption with key', () => {
  beforeEach(() => {
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', TEST_KEY_HEX);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('encrypt', () => {
    it('should return a string when encrypting', async () => {
      const { encrypt } = await import('@/lib/encryption');
      const result = encrypt('hello');
      expect(typeof result).toBe('string');
    });

    it('should return ciphertext in iv:authTag:ciphertext format', async () => {
      const { encrypt } = await import('@/lib/encryption');
      const result = encrypt('hello');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);

      expect(parts[0]).toMatch(/^[0-9a-f]+$/i); // iv
      expect(parts[1]).toMatch(/^[0-9a-f]+$/i); // auth tag
      expect(parts[2]).toMatch(/^[0-9a-f]+$/i); // ciphertext

      // IV should be 16 bytes = 32 hex chars
      expect(parts[0].length).toBe(32);
      // Auth tag should be 16 bytes = 32 hex chars
      expect(parts[1].length).toBe(32);
    });

    it('should decrypt(encrypt(text)) return the original text', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const original = 'sensitive-oauth-token-12345';
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext for the same input (different IV)', async () => {
      const { encrypt } = await import('@/lib/encryption');
      const input = 'same-text';
      const result1 = encrypt(input);
      const result2 = encrypt(input);

      expect(result1).not.toBe(result2);
      const iv1 = result1.split(':')[0];
      const iv2 = result2.split(':')[0];
      expect(iv1).not.toBe(iv2);
    });

    it('should encrypt and decrypt empty string', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const encrypted = encrypt('');
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe('');
    });

    it('should handle long text', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const longText = 'A'.repeat(10000);
      const encrypted = encrypt(longText);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(longText);
    });

    it('should handle unicode characters', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const unicode = 'héllo wörld 🚀 日本語';
      const encrypted = encrypt(unicode);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(unicode);
    });
  });

  describe('decrypt (error handling)', () => {
    it('should handle tampered ciphertext gracefully (no throw)', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const original = 'secret-data';
      const encrypted = encrypt(original);

      const parts = encrypted.split(':');
      const tamperedCiphertext = parts[2].slice(0, -2) + '00';
      const tampered = `${parts[0]}:${parts[1]}:${tamperedCiphertext}`;

      const result = decrypt(tampered);
      expect(result).toBe(tampered);
    });

    it('should handle tampered auth tag gracefully', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const original = 'secret-data';
      const encrypted = encrypt(original);

      const parts = encrypted.split(':');
      const tamperedTag = parts[1].slice(0, -2) + 'ff';
      const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;

      const result = decrypt(tampered);
      expect(result).toBe(tampered);
    });

    it('should handle tampered IV gracefully', async () => {
      const { encrypt, decrypt } = await import('@/lib/encryption');
      const original = 'secret-data';
      const encrypted = encrypt(original);

      const parts = encrypted.split(':');
      const tamperedIv = parts[0].slice(0, -2) + 'aa';
      const tampered = `${tamperedIv}:${parts[1]}:${parts[2]}`;

      const result = decrypt(tampered);
      expect(result).toBe(tampered);
    });

    it('should return original string if not in encrypted format', async () => {
      const { decrypt } = await import('@/lib/encryption');
      const result = decrypt('not-a-valid-format');
      expect(result).toBe('not-a-valid-format');
    });

    it('should return empty string for empty input', async () => {
      const { decrypt } = await import('@/lib/encryption');
      const result = decrypt('');
      expect(result).toBe('');
    });
  });

  describe('isEncrypted', () => {
    it('should return true for encrypted text', async () => {
      const { encrypt, isEncrypted } = await import('@/lib/encryption');
      const encrypted = encrypt('test');
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it('should return false for plain text', async () => {
      const { isEncrypted } = await import('@/lib/encryption');
      expect(isEncrypted('hello')).toBe(false);
    });

    it('should return false for empty string', async () => {
      const { isEncrypted } = await import('@/lib/encryption');
      expect(isEncrypted('')).toBe(false);
    });

    it('should return false for invalid format', async () => {
      const { isEncrypted } = await import('@/lib/encryption');
      expect(isEncrypted('abc:def')).toBe(false);
      expect(isEncrypted('abc:def:ghi')).toBe(false);
    });
  });

  describe('encryptJson / decryptJson', () => {
    it('should encrypt and decrypt JSON objects', async () => {
      const { encryptJson, decryptJson } = await import('@/lib/encryption');
      const obj = { accessToken: 'tok_123', refreshToken: 'ref_456', provider: 'google' };

      const encrypted = encryptJson(obj);
      expect(encrypted.encrypted).toBeDefined();
      expect(typeof encrypted.encrypted).toBe('string');

      const decrypted = decryptJson<typeof obj>(encrypted);
      expect(decrypted.accessToken).toBe('tok_123');
      expect(decrypted.refreshToken).toBe('ref_456');
      expect(decrypted.provider).toBe('google');
    });

    it('should return original for non-encrypted objects', async () => {
      const { decryptJson } = await import('@/lib/encryption');
      const obj = { accessToken: 'plain-token' };
      const result = decryptJson(obj);
      expect(result).toEqual(obj);
    });

    it('should return null/undefined as-is', async () => {
      const { decryptJson } = await import('@/lib/encryption');
      expect(decryptJson(null)).toBeNull();
      expect(decryptJson(undefined)).toBeUndefined();
    });
  });
});

// ============================================
// Tests WITHOUT encryption key (graceful degradation)
// These run in a separate describe block to avoid module-level
// key caching in getKey().
// ============================================

describe('encryption without key (graceful degradation)', () => {
  beforeEach(() => {
    vi.stubEnv('TOKEN_ENCRYPTION_KEY', '');
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return original text when key is not configured', async () => {
    const { encrypt } = await import('@/lib/encryption');
    const result = encrypt('test');
    expect(result).toBe('test');
  });

  it('should return original ciphertext when key is not configured', async () => {
    const { decrypt } = await import('@/lib/encryption');
    const result = decrypt('some-ciphertext');
    expect(result).toBe('some-ciphertext');
  });

  it('should return false for isEncrypted when key not set', async () => {
    const { isEncrypted } = await import('@/lib/encryption');
    expect(isEncrypted('test')).toBe(false);
  });
});
