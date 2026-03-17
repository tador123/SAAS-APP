ALTER TABLE users DROP COLUMN IF EXISTS stripecustomerid;
ALTER TABLE users ADD COLUMN "stripeCustomerId" VARCHAR(255);
