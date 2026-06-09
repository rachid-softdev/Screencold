-- Add CHECK constraint to prevent negative credits
ALTER TABLE "User" ADD CONSTRAINT "credits_non_negative" CHECK (credits >= 0);

-- Add CHECK constraint to ensure score is within 0-100 range
ALTER TABLE "Audit" ADD CONSTRAINT "score_range" CHECK (overallScore >= 0 AND overallScore <= 100);

-- Add CHECK constraint to ensure positive credit amounts
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "positive_amount" CHECK (amount > 0);
