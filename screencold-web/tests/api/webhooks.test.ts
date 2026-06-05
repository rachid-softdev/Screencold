/**
 * Stripe Webhook Integration Tests
 *
 * Covers:
 * - POST /api/webhooks/stripe — handle Stripe events
 * - Signature verification (missing, invalid)
 * - Idempotency key handling (duplicate events)
 * - Various event types: checkout.session.completed,
 *   customer.subscription.created/updated/deleted,
 *   invoice.paid, invoice.payment_failed
 *
 * Pattern: mock stripe, @/lib/prisma, @/lib/entitlements at module level.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mocks
// ============================================

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  stripeEvent: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  creditTransaction: {
    create: vi.fn(),
  },
  userOrganization: {
    findFirst: vi.fn(),
  },
  subscription: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
};

vi.mock('@/lib/prisma', () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

vi.mock('@/lib/entitlements', () => ({
  handleStripeWebhook: vi.fn(),
  ensureEntitlementsInitialized: vi.fn(),
  getFeatureGateService: vi.fn(),
  initializeFeatureGateService: vi.fn(),
  PrismaEntitlementRepository: vi.fn(),
}));

vi.mock('@/lib/entitlements/repository', () => ({
  PrismaEntitlementRepository: vi.fn(() => ({
    // repository methods if needed
  })),
}));

const mockStripeConstructEvent = vi.fn();

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    webhooks: {
      constructEvent: mockStripeConstructEvent,
    },
    customers: {
      create: vi.fn(),
    },
  })),
}));

import { handleStripeWebhook, ensureEntitlementsInitialized } from '@/lib/entitlements';

// ============================================
// Helpers
// ============================================

const VALID_SIGNATURE = 't=123,v1=valid_signature_hex';

function createStripeRequest(body: unknown, signature?: string): Request {
  const headers = new Headers({
    'content-type': 'application/json',
  });
  if (signature) {
    headers.set('stripe-signature', signature);
  }
  return new Request('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function createStripeEvent(type: string, overrides: Record<string, unknown> = {}): any {
  return {
    id: `evt_${Date.now()}`,
    type,
    data: {
      object: {
        id: `obj_${Date.now()}`,
        customer: 'cus_123',
        subscription: 'sub_123',
        metadata: {},
        ...overrides,
      },
    },
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_mock';
  });

  describe('signature verification', () => {
    it('should return 400 when stripe-signature header is missing', async () => {
      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest({});

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Missing signature');
    });

    it('should return 400 when signature is invalid', async () => {
      mockStripeConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest({ type: 'checkout.session.completed' }, 'invalid-signature');

      const response = await POST(request);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid signature');
    });
  });

  describe('idempotency', () => {
    it('should skip already processed events', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed');
      mockStripeConstructEvent.mockReturnValue(event);
      mockPrisma.stripeEvent.findUnique.mockResolvedValue({
        eventId: event.id,
        type: event.type,
        processed: true,
      });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.received).toBe(true);
      expect(body.idempotent).toBe(true);
      // Should not process the event again
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reprocess unprocessed events that exist in DB', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed');
      mockStripeConstructEvent.mockReturnValue(event);
      mockPrisma.stripeEvent.findUnique.mockResolvedValue({
        eventId: event.id,
        type: event.type,
        processed: false,
        data: event.data.object,
      });

      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id, processed: false });
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.update.mockResolvedValue({ id: 1, processed: true });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        stripeCustomerId: 'cus_123',
      });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.received).toBe(true);
      // Should have processed through transaction
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should return 500 when idempotency check fails', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed');
      mockStripeConstructEvent.mockReturnValue(event);
      mockPrisma.stripeEvent.findUnique.mockRejectedValue(new Error('DB error'));

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.error).toBe('Idempotency check failed');
    });
  });

  describe('checkout.session.completed', () => {
    it('should handle credits purchase successfully', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed', {
        metadata: { type: 'CREDITS_PURCHASE', credits: '100' },
      });
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id, processed: false });
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.update.mockResolvedValue({ id: 1, processed: true });
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        stripeCustomerId: 'cus_123',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.creditTransaction.create.mockResolvedValue({ id: 'tx-1' });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.received).toBe(true);
      // Should increment credits
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { credits: { increment: 100 } },
        }),
      );
      // Should record transaction
      expect(mockPrisma.creditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            amount: 100,
            type: 'PURCHASE',
          }),
        }),
      );
    });

    it('should handle subscription plan upgrade', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed', {
        metadata: { plan: 'PRO', credits: '200' },
      });
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id, processed: false });
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.update.mockResolvedValue({ id: 1, processed: true });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        stripeCustomerId: 'cus_123',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.creditTransaction.create.mockResolvedValue({ id: 'tx-1' });
      mockPrisma.userOrganization.findFirst.mockResolvedValue(null); // no org

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      // User should be updated with PRO plan
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            plan: 'PRO',
            stripeSubscriptionId: 'sub_123',
            credits: { increment: 200 },
          }),
        }),
      );
    });

    it('should update org subscription when user belongs to an org', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed', {
        metadata: { plan: 'STARTER', credits: '50' },
      });
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id, processed: false });
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.update.mockResolvedValue({ id: 1, processed: true });

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user-1',
        stripeCustomerId: 'cus_123',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.creditTransaction.create.mockResolvedValue({ id: 'tx-1' });
      mockPrisma.userOrganization.findFirst.mockResolvedValue({
        userId: 'user-1',
        orgId: 'org-1',
      });
      mockPrisma.subscription.upsert.mockResolvedValue({ id: 'sub-1' });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(mockPrisma.subscription.upsert).toHaveBeenCalled();
    });

    it('should handle user not found gracefully', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed', {
        metadata: { type: 'CREDITS_PURCHASE', credits: '50' },
      });
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id, processed: false });
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.update.mockResolvedValue({ id: 1, processed: true });
      // No user found for this stripe customer
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert — should not crash, just skip silently
      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('subscription events (entitlements handler)', () => {
    it('should call entitlements handler for customer.subscription.created', async () => {
      // Arrange
      const event = createStripeEvent('customer.subscription.created');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id });

      vi.mocked(ensureEntitlementsInitialized).mockResolvedValue();
      vi.mocked(handleStripeWebhook).mockResolvedValue({ success: true });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(ensureEntitlementsInitialized).toHaveBeenCalled();
      expect(handleStripeWebhook).toHaveBeenCalled();
    });

    it('should handle customer.subscription.updated', async () => {
      // Arrange
      const event = createStripeEvent('customer.subscription.updated');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id });

      vi.mocked(ensureEntitlementsInitialized).mockResolvedValue();
      vi.mocked(handleStripeWebhook).mockResolvedValue({ success: true });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
      expect(handleStripeWebhook).toHaveBeenCalled();
    });

    it('should handle customer.subscription.deleted', async () => {
      // Arrange
      const event = createStripeEvent('customer.subscription.deleted');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id });

      vi.mocked(ensureEntitlementsInitialized).mockResolvedValue();
      vi.mocked(handleStripeWebhook).mockResolvedValue({ success: true });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should handle invoice.paid', async () => {
      // Arrange
      const event = createStripeEvent('invoice.paid');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id });

      vi.mocked(ensureEntitlementsInitialized).mockResolvedValue();
      vi.mocked(handleStripeWebhook).mockResolvedValue({ success: true });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should handle invoice.payment_failed', async () => {
      // Arrange
      const event = createStripeEvent('invoice.payment_failed');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id });

      vi.mocked(ensureEntitlementsInitialized).mockResolvedValue();
      vi.mocked(handleStripeWebhook).mockResolvedValue({ success: true });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert
      expect(response.status).toBe(200);
    });

    it('should log but not crash when entitlements handler fails', async () => {
      // Arrange
      const event = createStripeEvent('customer.subscription.updated');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id });

      vi.mocked(ensureEntitlementsInitialized).mockResolvedValue();
      vi.mocked(handleStripeWebhook).mockResolvedValue({ success: false, error: 'Something failed' });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);

      // Assert — should still return 200 since the event was recorded
      expect(response.status).toBe(200);
    });
  });

  describe('other events', () => {
    it('should handle events without special processing gracefully', async () => {
      // Arrange — an event type not in the switch
      const event = createStripeEvent('charge.succeeded');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (cb: Function) => cb(mockPrisma));
      mockPrisma.stripeEvent.upsert.mockResolvedValue({ id: 1, eventId: event.id });

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(body.received).toBe(true);
      // Should not trigger checkout handler
      expect(mockPrisma.user.findFirst).not.toHaveBeenCalled();
      // Should not trigger entitlements handler
      expect(handleStripeWebhook).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should return 500 when webhook handler throws unexpected error', async () => {
      // Arrange
      const event = createStripeEvent('checkout.session.completed');
      mockStripeConstructEvent.mockReturnValue(event);

      mockPrisma.stripeEvent.findUnique.mockResolvedValue(null);
      // Make $transaction throw
      mockPrisma.$transaction.mockRejectedValue(new Error('Unexpected DB error'));

      const { POST } = await import('@/app/api/webhooks/stripe/route');
      const request = createStripeRequest(event, VALID_SIGNATURE);

      // Act
      const response = await POST(request);
      const body = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(body.error).toBe('Webhook handler failed');
    });
  });
});
