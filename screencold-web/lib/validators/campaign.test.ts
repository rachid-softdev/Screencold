import { describe, it, expect } from 'vitest';
import {
  prospectSchema,
  createCampaignSchema,
  updateCampaignSchema,
  importProspectsSchema,
  csvRowSchema,
  parseCSV,
  listCampaignsSchema,
  launchCampaignSchema,
} from './campaign';

describe('campaign validators', () => {
  describe('prospectSchema', () => {
    it('should validate valid prospect with URL', () => {
      const validData = {
        url: 'https://example.com',
        companyName: 'Example Inc',
        contactName: 'John Doe',
        contactEmail: 'john@example.com',
      };

      const result = prospectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate URL without protocol', () => {
      const validData = {
        url: 'example.com',
      };

      const result = prospectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const invalidData = {
        url: 'not-a-url',
      };

      const result = prospectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional companyName', () => {
      const validData = {
        url: 'https://example.com',
        companyName: 'Test Company',
      };

      const result = prospectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional contact fields', () => {
      const validData = {
        url: 'https://example.com',
        contactName: 'John',
      };

      const result = prospectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate email format', () => {
      const invalidData = {
        url: 'https://example.com',
        contactEmail: 'invalid-email',
      };

      const result = prospectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept empty string for optional email', () => {
      const validData = {
        url: 'https://example.com',
        contactEmail: '',
      };

      const result = prospectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept notes', () => {
      const validData = {
        url: 'https://example.com',
        notes: 'This is a note about the prospect',
      };

      const result = prospectSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject companyName too long', () => {
      const invalidData = {
        url: 'https://example.com',
        companyName: 'a'.repeat(256),
      };

      const result = prospectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject notes too long', () => {
      const invalidData = {
        url: 'https://example.com',
        notes: 'a'.repeat(1001),
      };

      const result = prospectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createCampaignSchema', () => {
    it('should validate valid campaign name', () => {
      const validData = {
        name: 'My Campaign',
      };

      const result = createCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
      };

      const result = createCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name too short (<3 chars)', () => {
      const invalidData = {
        name: 'ab',
      };

      const result = createCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name too long (>100 chars)', () => {
      const invalidData = {
        name: 'a'.repeat(101),
      };

      const result = createCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional prospects array', () => {
      const validData = {
        name: 'Campaign',
        prospects: [
          { url: 'https://example.com' },
          { url: 'https://test.com' },
        ],
      };

      const result = createCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject prospects array empty', () => {
      const invalidData = {
        name: 'Campaign',
        prospects: [],
      };

      const result = createCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject too many prospects (>500)', () => {
      const invalidData = {
        name: 'Campaign',
        prospects: Array(501).fill({ url: 'https://example.com' }),
      };

      const result = createCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept with prospects containing all fields', () => {
      const validData = {
        name: 'Campaign',
        prospects: [
          {
            url: 'https://example.com',
            companyName: 'Example',
            contactName: 'John',
            contactEmail: 'john@example.com',
            notes: 'Note',
          },
        ],
      };

      const result = createCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('updateCampaignSchema', () => {
    it('should validate valid update', () => {
      const validData = {
        name: 'Updated Campaign',
      };

      const result = updateCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept addProspects', () => {
      const validData = {
        addProspects: [{ url: 'https://new.com' }],
      };

      const result = updateCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept removeProspectIds', () => {
      const validData = {
        removeProspectIds: ['ckopqwo3u0000jv3hg7r1z3xh', 'ckopqwwo30000jv3hg7r1z3xi'],
      };

      const result = updateCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject too many addProspects (>100)', () => {
      const invalidData = {
        addProspects: Array(101).fill({ url: 'https://example.com' }),
      };

      const result = updateCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('importProspectsSchema', () => {
    it('should validate valid import', () => {
      const validData = {
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
        prospects: [{ url: 'https://example.com' }],
      };

      const result = importProspectsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid campaignId', () => {
      const invalidData = {
        campaignId: 'invalid-id',
        prospects: [{ url: 'https://example.com' }],
      };

      const result = importProspectsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept mode option', () => {
      const validData = {
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
        prospects: [{ url: 'https://example.com' }],
        mode: 'replace',
      };

      const result = importProspectsSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should default mode to add', () => {
      const validData = {
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
        prospects: [{ url: 'https://example.com' }],
      };

      const result = importProspectsSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mode).toBe('add');
      }
    });

    it('should reject too many prospects (>1000)', () => {
      const invalidData = {
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
        prospects: Array(1001).fill({ url: 'https://example.com' }),
      };

      const result = importProspectsSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('csvRowSchema', () => {
    it('should validate valid CSV row', () => {
      const validData = {
        url: 'https://example.com',
        companyName: 'Test',
        contactName: 'John',
        contactEmail: 'john@example.com',
        notes: 'Note',
      };

      const result = csvRowSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept optional fields', () => {
      const validData = {
        url: 'https://example.com',
      };

      const result = csvRowSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('parseCSV', () => {
    it('should parse simple CSV', () => {
      const csv = `url,companyName,contactName,contactEmail
https://example.com,Test Company,John,john@example.com`;

      const result = parseCSV(csv);
      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].url).toBe('https://example.com');
      expect(result.rows[0].companyName).toBe('Test Company');
    });

    it('should handle CSV without header', () => {
      const csv = `https://example.com,Test Company`;

      const result = parseCSV(csv);
      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(1);
    });

    it('should handle multiple rows', () => {
      const csv = `url
https://example1.com
https://example2.com
https://example3.com`;

      const result = parseCSV(csv);
      expect(result.success).toBe(true);
      expect(result.rows).toHaveLength(3);
    });

    it('should return errors for invalid rows', () => {
      const csv = `url
https://example.com
invalid-url`;

      const result = parseCSV(csv);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty lines', () => {
      const csv = `url
https://example.com

https://test.com
`;

      const result = parseCSV(csv);
      expect(result.rows).toHaveLength(2);
    });

    it('should handle quoted fields', () => {
      const csv = `url,companyName
"https://example.com","Company, Inc."`;

      const result = parseCSV(csv);
      expect(result.success).toBe(true);
      expect(result.rows[0].companyName).toBe('Company, Inc.');
    });
  });

  describe('listCampaignsSchema', () => {
    it('should use default values', () => {
      const result = listCampaignsSchema.parse({});
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.sortBy).toBe('createdAt');
      expect(result.sortOrder).toBe('desc');
    });

    it('should parse valid params', () => {
      const result = listCampaignsSchema.parse({
        page: '2',
        limit: '50',
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
      expect(result.sortBy).toBe('name');
      expect(result.sortOrder).toBe('asc');
    });

    it('should reject invalid page', () => {
      expect(() => listCampaignsSchema.parse({ page: '0' })).toThrow();
    });

    it('should reject invalid limit', () => {
      expect(() => listCampaignsSchema.parse({ limit: '101' })).toThrow();
    });
  });

  describe('launchCampaignSchema', () => {
    it('should validate valid launch', () => {
      const validData = {
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
      };

      const result = launchCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const result = launchCampaignSchema.parse({ campaignId: 'ckopqwo3u0000jv3hg7r1z3xh' });
      expect(result.startFrom).toBe(0);
      expect(result.parallelJobs).toBe(3);
    });

    it('should reject invalid campaignId', () => {
      const invalidData = {
        campaignId: 'invalid',
      };

      const result = launchCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept custom startFrom', () => {
      const result = launchCampaignSchema.parse({
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
        startFrom: '5',
      });

      expect(result.startFrom).toBe(5);
    });

    it('should accept custom parallelJobs', () => {
      const result = launchCampaignSchema.parse({
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
        parallelJobs: '5',
      });

      expect(result.parallelJobs).toBe(5);
    });

    it('should reject parallelJobs > 10', () => {
      const result = launchCampaignSchema.safeParse({
        campaignId: 'ckopqwo3u0000jv3hg7r1z3xh',
        parallelJobs: '11',
      });

      expect(result.success).toBe(false);
    });
  });
});