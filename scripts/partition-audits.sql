-- Partition Audit table by month on createdAt
-- Step 1: Enable pg_partman extension
CREATE EXTENSION IF NOT EXISTS pg_partman;

-- Step 2: Convert Audit table to partitioned form
-- Create the partitioned table structure
ALTER TABLE "Audit" RENAME TO "Audit_old";

CREATE TABLE "Audit" (
    id TEXT NOT NULL,
    "prospectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "annotatedUrl" TEXT,
    "mobileUrl" TEXT,
    issues JSONB,
    "siteType" TEXT,
    "overallScore" INTEGER,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "emailPs" TEXT,
    status TEXT NOT NULL DEFAULT 'PROCESSING',
    "errorMessage" TEXT,
    "processingTime" INTEGER,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "overall_score_range" CHECK ("overallScore" IS NULL OR ("overallScore" >= 0 AND "overallScore" <= 100))
) PARTITION BY RANGE ("createdAt");

-- Step 3: Create monthly partitions for current and future months
SELECT partman.create_parent(
    p_parent_table := 'public."Audit"',
    p_control := 'createdAt',
    p_interval := '1 month',
    p_premake := 3,
    p_start_partition := to_char(date_trunc('month', NOW()), 'YYYY-MM-01')
);

-- Step 4: Create partitions for past months (backfill)
-- Create partitions for each month of existing data
SELECT partman.create_partition_time(
    p_parent_table := 'public."Audit"',
    p_control := 'createdAt',
    p_interval := '1 month',
    p_start_partition := (
        SELECT to_char(date_trunc('month', MIN("createdAt")), 'YYYY-MM-01')
        FROM "Audit_old"
    ),
    p_end_partition := to_char(date_trunc('month', NOW()) - interval '1 month', 'YYYY-MM-01'),
    p_infinite_time_partitions := false
);

-- Step 5: Migrate existing data (batch in chunks to avoid locks)
DO $$
DECLARE
    batch_size INTEGER := 10000;
    offset_val INTEGER := 0;
    rows_moved INTEGER;
BEGIN
    LOOP
        INSERT INTO "Audit"
        SELECT * FROM "Audit_old"
        ORDER BY "createdAt"
        LIMIT batch_size
        OFFSET offset_val;

        GET DIAGNOSTICS rows_moved = ROW_COUNT;
        EXIT WHEN rows_moved = 0;
        offset_val := offset_val + batch_size;
        COMMIT;
    END LOOP;
END $$;

-- Step 6: Recreate indexes on partitioned table
CREATE INDEX IF NOT EXISTS "Audit_userId_idx" ON "Audit" ("userId");
CREATE INDEX IF NOT EXISTS "Audit_status_idx" ON "Audit" (status);
CREATE INDEX IF NOT EXISTS "Audit_userId_status_idx" ON "Audit" ("userId", status);
CREATE UNIQUE INDEX IF NOT EXISTS "Audit_prospectId_key" ON "Audit" ("prospectId");

-- Step 7: Drop old table when migration is verified
-- DROP TABLE "Audit_old"; -- Uncomment after verification

-- Step 8: Schedule automatic partition maintenance
-- Requires pg_cron extension
-- SELECT cron.schedule('create-partitions', '0 0 1 * *', $$
--     SELECT partman.create_partition_time('public."Audit"', 'createdAt', '1 month', premake := 3);
-- $$);
