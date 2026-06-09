-- Add composite index on Audit for userId + status queries
CREATE INDEX IF NOT EXISTS "Audit_userId_status_idx" ON "Audit" ("userId", "status");

-- Add composite index on CreditTransaction for userId + createdAt queries
CREATE INDEX IF NOT EXISTS "CreditTransaction_userId_createdAt_idx" ON "CreditTransaction" ("userId", "createdAt");
