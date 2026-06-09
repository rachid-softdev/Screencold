-- Create CreditTransactionType enum
CREATE TYPE "CreditTransactionType" AS ENUM ('AUDIT_DEBIT', 'PURCHASE', 'BONUS', 'REFUND', 'RESET', 'ADMIN_ADJUSTMENT');

-- Add temporary column with the enum type
ALTER TABLE "CreditTransaction" ADD COLUMN "type_new" "CreditTransactionType" NOT NULL DEFAULT 'AUDIT_DEBIT';

-- Copy data from old text column, handling both lowercase and uppercase values
UPDATE "CreditTransaction" SET "type_new" = CASE
  WHEN type = 'debit' OR type = 'AUDIT_DEBIT' THEN 'AUDIT_DEBIT'::"CreditTransactionType"
  WHEN type = 'purchase' OR type = 'PURCHASE' THEN 'PURCHASE'::"CreditTransactionType"
  WHEN type = 'bonus' OR type = 'BONUS' THEN 'BONUS'::"CreditTransactionType"
  WHEN type = 'refund' OR type = 'REFUND' THEN 'REFUND'::"CreditTransactionType"
  ELSE 'AUDIT_DEBIT'::"CreditTransactionType"
END;

-- Drop old column (cascades to drop the index on "type")
ALTER TABLE "CreditTransaction" DROP COLUMN "type";

-- Rename new column to original name
ALTER TABLE "CreditTransaction" RENAME COLUMN "type_new" TO "type";

-- Recreate index on the new enum column (matching @@index([type]) in schema)
CREATE INDEX "CreditTransaction_type_idx" ON "CreditTransaction"("type");
