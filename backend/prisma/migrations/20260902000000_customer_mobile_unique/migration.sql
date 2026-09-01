DROP INDEX "customers_mobile_idx";

CREATE UNIQUE INDEX "customers_mobile_key" ON "customers"("mobile");
