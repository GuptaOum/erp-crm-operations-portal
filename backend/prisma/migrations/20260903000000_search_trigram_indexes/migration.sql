CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "customers_name_trgm" ON "customers" USING gin ("name" gin_trgm_ops);
CREATE INDEX "customers_businessName_trgm" ON "customers" USING gin ("businessName" gin_trgm_ops);
CREATE INDEX "customers_mobile_trgm" ON "customers" USING gin ("mobile" gin_trgm_ops);
CREATE INDEX "customers_email_trgm" ON "customers" USING gin ("email" gin_trgm_ops);
CREATE INDEX "customers_gstNumber_trgm" ON "customers" USING gin ("gstNumber" gin_trgm_ops);

CREATE INDEX "products_name_trgm" ON "products" USING gin ("name" gin_trgm_ops);
CREATE INDEX "products_sku_trgm" ON "products" USING gin ("sku" gin_trgm_ops);
CREATE INDEX "products_category_trgm" ON "products" USING gin ("category" gin_trgm_ops);
