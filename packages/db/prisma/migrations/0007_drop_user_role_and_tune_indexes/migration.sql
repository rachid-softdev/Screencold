-- ============================================================
-- Drop the redundant scalar User.role column.
-- Role is now modeled exclusively via the UserRole table to avoid
-- two sources of truth (see REVIEW.md Sprint 2, item 14).
-- ============================================================
ALTER TABLE "User" DROP COLUMN "role";

-- ============================================================
-- Remove redundant indexes that duplicate an existing UNIQUE constraint.
-- Prisma creates a UNIQUE index for `@unique` fields; the extra non-unique
-- `@@index` on the same column is pure write overhead (REVIEW.md #18).
-- ============================================================
DROP INDEX IF EXISTS "User_email_idx";
DROP INDEX IF EXISTS "User_stripeCustomerId_idx";
DROP INDEX IF EXISTS "User_googleId_idx";
DROP INDEX IF EXISTS "ApiKey_key_idx";
DROP INDEX IF EXISTS "Subscription_stripeSubId_idx";
DROP INDEX IF EXISTS "StripeEvent_eventId_idx";

-- ============================================================
-- Add missing indexes for common filter/sort columns (REVIEW.md #20).
-- ============================================================
CREATE INDEX IF NOT EXISTS "User_creditsResetsAt_idx" ON "User" ("creditsResetsAt");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User" ("createdAt");
CREATE INDEX IF NOT EXISTS "Audit_createdAt_idx" ON "Audit" ("createdAt");
CREATE INDEX IF NOT EXISTS "SentEmail_auditId_idx" ON "SentEmail" ("auditId");
