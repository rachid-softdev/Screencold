/**
 * Auth Routes Integration Tests
 *
 * Covers:
 * - POST /api/auth/register — registration flow
 * - POST /api/auth/forgot-password — forgot password flow
 * - POST /api/auth/reset-password — reset password flow
 *
 * Pattern: mock @/lib/prisma, bcryptjs, stripe at module level.
 * These are public routes — no auth middleware to mock.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  verificationToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

const mockBcrypt = {
  hash: vi.fn(),
};

vi.mock('bcryptjs', () => ({
  default: mockBcrypt,
  hash: mockBcrypt.hash,
}));

const mockStripeCustomersCreate = vi.fn();

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    customers: {
      create: mockStripeCustomersCreate,
    },
    webhooks: {
      constructEvent: vi.fn(),
    },
  })),
}));

// ============================================
// Helpers
// ============================================

function createPostRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ============================================
// Register
// ============================================

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
  });

  it('should register a new user successfully', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('hashed-password-12');
    mockStripeCustomersCreate.mockResolvedValue({ id: 'cus_123' });
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      plan: 'FREE',
      credits: 5,
      stripeCustomerId: 'cus_123',
    });
    mockPrisma.verificationToken.create.mockResolvedValue({
      identifier: 'john@example.com',
      token: 'vt-123',
      expires: new Date(),
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'securePass123',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(body.message).toBe('Compte créé avec succès');
    expect(body.user).toBeDefined();
    expect(body.user.email).toBe('john@example.com');
    expect(body.user.name).toBe('John Doe');
    expect(body.user.id).toBe('user-1');
    // Password should never be in response
    expect(body.user.password).toBeUndefined();
  });

  it('should return 400 when name is missing', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      email: 'john@example.com',
      password: 'securePass123',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for invalid email', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      name: 'John',
      email: 'not-an-email',
      password: 'securePass123',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for short password', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      name: 'John',
      email: 'john@example.com',
      password: '123',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 when email already exists', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'existing-user',
      email: 'john@example.com',
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'securePass123',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('USER_EXISTS');
  });

  it('should create user even if Stripe customer creation fails', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockStripeCustomersCreate.mockRejectedValue(new Error('Stripe API error'));
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      name: 'John Doe',
      plan: 'FREE',
      credits: 5,
      stripeCustomerId: null,
    });
    mockPrisma.verificationToken.create.mockResolvedValue({
      identifier: 'john@example.com',
      token: 'vt-123',
      expires: new Date(),
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'securePass123',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(body.user.id).toBe('user-1');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripeCustomerId: null }),
      }),
    );
  });

  it('should lowercase email before creating user', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('hashed-password');
    mockStripeCustomersCreate.mockResolvedValue({ id: 'cus_123' });
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'John@Example.COM',
      name: 'John',
    });
    mockPrisma.verificationToken.create.mockResolvedValue({
      identifier: 'John@Example.COM',
      token: 'vt-123',
      expires: new Date(),
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      name: 'John',
      email: 'John@Example.COM',
      password: 'securePass123',
    });

    // Act
    await POST(request);

    // Assert — email must be lowercased
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'john@example.com' }),
      }),
    );
    expect(mockStripeCustomersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'john@example.com' }),
    );
  });

  it('should return 500 on unexpected error', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB crash'));

    const { POST } = await import('@/app/api/auth/register/route');
    const request = createPostRequest('http://localhost:3000/api/auth/register', {
      name: 'John',
      email: 'john@example.com',
      password: 'securePass123',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('INTERNAL_ERROR');
  });
});

// ============================================
// Forgot Password
// ============================================

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create reset token for valid email', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
      password: 'hashed-password',
    });
    mockPrisma.verificationToken.create.mockResolvedValue({
      identifier: 'john@example.com',
      token: 'reset-token-1',
      expires: new Date(Date.now() + 3600000),
    });

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/forgot-password', {
      email: 'john@example.com',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.message).toContain('Si un compte existe');
  });

  it('should return generic message for non-existent email (prevent enumeration)', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/forgot-password', {
      email: 'nonexistent@example.com',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert — same message to prevent email enumeration
    expect(response.status).toBe(200);
    expect(body.message).toContain('Si un compte existe');
  });

  it('should return 400 for OAuth-only users without password', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-oauth',
      email: 'google@example.com',
      password: null, // OAuth-only account
    });

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/forgot-password', {
      email: 'google@example.com',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.message).toContain('Google');
  });

  it('should return 400 for invalid email format', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/forgot-password', {
      email: 'not-valid',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 500 on unexpected error', async () => {
    // Arrange
    mockPrisma.user.findUnique.mockRejectedValue(new Error('DB crash'));

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/forgot-password', {
      email: 'john@example.com',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('INTERNAL_ERROR');
  });
});

// ============================================
// Reset Password
// ============================================

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reset password with valid token', async () => {
    // Arrange
    const futureDate = new Date(Date.now() + 3600000);
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'john@example.com',
      token: 'valid-token',
      expires: futureDate,
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
    });
    mockBcrypt.hash.mockResolvedValue('new-hashed-password');
    mockPrisma.user.update.mockResolvedValue({
      id: 'user-1',
      email: 'john@example.com',
    });
    mockPrisma.verificationToken.delete.mockResolvedValue({});

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/reset-password', {
      token: 'valid-token',
      password: 'newSecurePass456',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(body.message).toContain('mis à jour');
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(mockPrisma.verificationToken.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: 'valid-token' } }),
    );
  });

  it('should return 400 for invalid token', async () => {
    // Arrange
    mockPrisma.verificationToken.findUnique.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/reset-password', {
      token: 'invalid-token',
      password: 'newSecurePass456',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('INVALID_TOKEN');
  });

  it('should return 400 for expired token', async () => {
    // Arrange
    const pastDate = new Date(Date.now() - 3600000);
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'john@example.com',
      token: 'expired-token',
      expires: pastDate,
    });

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/reset-password', {
      token: 'expired-token',
      password: 'newSecurePass456',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('TOKEN_EXPIRED');
  });

  it('should return 400 if token user not found', async () => {
    // Arrange
    const futureDate = new Date(Date.now() + 3600000);
    mockPrisma.verificationToken.findUnique.mockResolvedValue({
      identifier: 'deleted@example.com',
      token: 'valid-token',
      expires: futureDate,
    });
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/reset-password', {
      token: 'valid-token',
      password: 'newSecurePass456',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(body.error).toBe('USER_NOT_FOUND');
  });

  it('should return 400 for missing token', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/reset-password', {
      password: 'newSecurePass456',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for short password', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/reset-password', {
      token: 'some-token',
      password: 'short',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('VALIDATION_ERROR');
  });

  it('should return 500 on unexpected error', async () => {
    // Arrange
    mockPrisma.verificationToken.findUnique.mockRejectedValue(new Error('DB crash'));

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const request = createPostRequest('http://localhost:3000/api/auth/reset-password', {
      token: 'some-token',
      password: 'newSecurePass456',
    });

    // Act
    const response = await POST(request);
    const body = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(body.error).toBe('INTERNAL_ERROR');
  });
});
