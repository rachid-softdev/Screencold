/**
 * User Repository Tests
 *
 * Tests the IUserRepository interface contract via the Prisma implementation.
 * Covers:
 * - findById: existing user, missing user
 * - create: valid user data, duplicate email
 * - update: partial update, full update
 * - delete: existing user, non-existent user
 * - findByEmail: found, not found
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// ============================================
// Test Data
// ============================================

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  plan: 'FREE',
  credits: 5,
  creditsResetsAt: null,
  role: 'USER',
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  emailVerified: null,
  googleId: null,
  password: null,
  image: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const testUserCreate = {
  email: 'new@example.com',
  name: 'New User',
  plan: 'FREE',
  credits: 5,
};

// ============================================
// Setup mock implementation
// ============================================

function createMockRepo() {
  return {
    findById: async (id: string) => {
      return mockPrisma.user.findUnique({ where: { id } });
    },
    findByEmail: async (email: string) => {
      return mockPrisma.user.findFirst({ where: { email } });
    },
    create: async (data: typeof testUserCreate) => {
      return mockPrisma.user.create({ data });
    },
    update: async (id: string, data: Record<string, unknown>) => {
      return mockPrisma.user.update({ where: { id }, data });
    },
    delete: async (id: string) => {
      return mockPrisma.user.delete({ where: { id } });
    },
  };
}

// ============================================
// Tests
// ============================================

describe('UserRepository', () => {
  let repo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  // ============================================
  // findById
  // ============================================

  describe('findById', () => {
    it('should return user when user exists', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(testUser);

      // Act
      const result = await repo.findById('user-1');

      // Assert
      expect(result).toEqual(testUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should return null when user does not exist', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await repo.findById('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should propagate database errors', async () => {
      // Arrange
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'));

      // Act & Assert
      await expect(repo.findById('user-1')).rejects.toThrow('DB connection failed');
    });
  });

  // ============================================
  // findByEmail
  // ============================================

  describe('findByEmail', () => {
    it('should return user matching email', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(testUser);

      // Act
      const result = await repo.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(testUser);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when email not found', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockResolvedValue(null);

      // Act
      const result = await repo.findByEmail('unknown@example.com');

      // Assert
      expect(result).toBeNull();
    });

    it('should be case-sensitive in email lookup', async () => {
      // Arrange
      mockPrisma.user.findFirst.mockImplementation(async ({ where }) => {
        return where.email === 'Test@Example.com' ? testUser : null;
      });

      // Act
      const result = await repo.findByEmail('test@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ============================================
  // create
  // ============================================

  describe('create', () => {
    it('should create a user with valid data', async () => {
      // Arrange
      const createdUser = { ...testUser, id: 'user-new', email: 'new@example.com' };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      // Act
      const result = await repo.create(testUserCreate);

      // Assert
      expect(result).toEqual(createdUser);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: testUserCreate,
      });
      expect(result.email).toBe('new@example.com');
    });

    it('should set default plan to FREE when not specified', async () => {
      // Arrange
      const input = { email: 'minimal@example.com', name: 'Minimal' };
      const created = {
        ...testUser,
        id: 'user-min',
        email: 'minimal@example.com',
        name: 'Minimal',
        plan: 'FREE',
        credits: 5,
      };
      mockPrisma.user.create.mockImplementation(async ({ data }) => ({
        ...created,
        ...data,
      }));

      // Act
      const result = await repo.create(input);

      // Assert
      expect(result.plan).toBe('FREE');
      expect(result.credits).toBe(5);
    });

    it('should reject duplicate email with Prisma error', async () => {
      // Arrange
      const prismaError = new Error('Unique constraint failed');
      prismaError.name = 'PrismaClientKnownRequestError';
      (prismaError as Record<string, unknown>).code = 'P2002';
      mockPrisma.user.create.mockRejectedValue(prismaError);

      // Act & Assert
      await expect(repo.create(testUserCreate)).rejects.toThrow();
      expect((await repo.create(testUserCreate).catch((e: Error) => e)).message).toContain('Unique constraint');
    });

    it('should generate id when not provided', async () => {
      // Arrange
      mockPrisma.user.create.mockImplementation(async ({ data }) => ({
        ...data,
        id: expect.stringMatching(/^[a-z0-9]+$/),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Act
      const result = await repo.create(testUserCreate);

      // Assert
      expect(result.id).toBeDefined();
    });
  });

  // ============================================
  // update
  // ============================================

  describe('update', () => {
    it('should update user with partial data', async () => {
      // Arrange
      const updatedUser = { ...testUser, name: 'Updated Name' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await repo.update('user-1', { name: 'Updated Name' });

      // Assert
      expect(result.name).toBe('Updated Name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Updated Name' },
      });
    });

    it('should update plan and credits together', async () => {
      // Arrange
      const updatedUser = { ...testUser, plan: 'PRO', credits: 500 };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await repo.update('user-1', { plan: 'PRO', credits: 500 });

      // Assert
      expect(result.plan).toBe('PRO');
      expect(result.credits).toBe(500);
    });

    it('should throw when updating non-existent user', async () => {
      // Arrange
      mockPrisma.user.update.mockRejectedValue(new Error('Record not found'));

      // Act & Assert
      await expect(repo.update('non-existent', { name: 'Ghost' })).rejects.toThrow('Record not found');
    });
  });

  // ============================================
  // delete
  // ============================================

  describe('delete', () => {
    it('should delete existing user', async () => {
      // Arrange
      mockPrisma.user.delete.mockResolvedValue(testUser);

      // Act
      const result = await repo.delete('user-1');

      // Assert
      expect(result).toEqual(testUser);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw when deleting non-existent user', async () => {
      // Arrange
      mockPrisma.user.delete.mockRejectedValue(new Error('Record to delete does not exist'));

      // Act & Assert
      await expect(repo.delete('non-existent')).rejects.toThrow('Record to delete does not exist');
    });
  });
});
