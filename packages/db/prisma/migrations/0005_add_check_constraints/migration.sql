ALTER TABLE "User" ADD CONSTRAINT "credits_non_negative" CHECK (credits >= 0);
ALTER TABLE "Audit" ADD CONSTRAINT "overall_score_range" CHECK (overallScore IS NULL OR (overallScore >= 0 AND overallScore <= 100));
ALTER TABLE "CreditTransaction" ADD CONSTRAINT "amount_non_zero" CHECK (amount != 0);
