ALTER TABLE "emisor"
ADD COLUMN "facturapiCustomerId" VARCHAR(80);

CREATE UNIQUE INDEX "emisor_facturapiCustomerId_key" ON "emisor"("facturapiCustomerId");
