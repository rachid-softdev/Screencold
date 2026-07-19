-- Drop the contradictory CHECK constraint on CreditTransaction.amount.
-- Migration 0002 added `positive_amount` (amount > 0) and migration 0005 added
-- `amount_non_zero` (amount != 0). Together they reject any non-positive amount,
-- which blocks REFUND / ADMIN_ADJUSTMENT transactions that legitimately carry a
-- negative amount. Keeping only `amount_non_zero` (amount != 0) allows refunds
-- while still preventing zero-value (no-op) transactions.
ALTER TABLE "CreditTransaction" DROP CONSTRAINT IF EXISTS "positive_amount";
