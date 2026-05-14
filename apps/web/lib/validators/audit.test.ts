import { describe, it, expect } from 'vitest';
import { createAuditSchema } from './audit';

describe('audit validators', () => {
  describe('createAuditSchema', () => {
    it('should validate valid audit data', () => {
      const validData = {
        url: 'https://example.com',
        companyName: 'Example Inc',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
      };

      const result = createAuditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate minimal audit data', () => {
      const validData = {
        url: 'https://example.com',
      };

      const result = createAuditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        url: 'not-a-url',
      };

      const result = createAuditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        url: 'https://example.com',
        contactEmail: 'invalid-email',
      };

      const result = createAuditSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow empty optional fields', () => {
      const validData = {
        url: 'https://example.com',
        companyName: '',
        contactName: '',
        contactEmail: '',
      };

      const result = createAuditSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});