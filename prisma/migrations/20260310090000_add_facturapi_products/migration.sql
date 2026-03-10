-- CreateEnum
CREATE TYPE "FacturapiProductTaxType" AS ENUM ('IVA', 'ISR', 'IEPS');

-- CreateTable
CREATE TABLE "facturapiTaxabilityCatalog" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" VARCHAR(2) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "facturapiTaxabilityCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturapiProduct" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "emisorId" BIGINT NOT NULL,
    "env" "FacturapiEnv" NOT NULL,
    "facturapiId" VARCHAR(80) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "productKey" VARCHAR(20) NOT NULL,
    "unitKey" VARCHAR(10) NOT NULL,
    "unitName" VARCHAR(150) NOT NULL,
    "sku" VARCHAR(80),
    "price" DECIMAL(18,2) NOT NULL,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "taxabilityCode" VARCHAR(2) NOT NULL,
    "rawFacturapiData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "facturapiProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturapiProductTax" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "productId" BIGINT NOT NULL,
    "type" "FacturapiProductTaxType" NOT NULL,
    "rate" DECIMAL(10,6) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturapiProductTax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facturapiTaxabilityCatalog_uuid_key" ON "facturapiTaxabilityCatalog"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiTaxabilityCatalog_code_key" ON "facturapiTaxabilityCatalog"("code");

-- CreateIndex
CREATE INDEX "facturapiTaxabilityCatalog_deletedAt_idx" ON "facturapiTaxabilityCatalog"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiProduct_uuid_key" ON "facturapiProduct"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiProduct_emisorId_env_facturapiId_key" ON "facturapiProduct"("emisorId", "env", "facturapiId");

-- CreateIndex
CREATE INDEX "facturapiProduct_emisorId_env_idx" ON "facturapiProduct"("emisorId", "env");

-- CreateIndex
CREATE INDEX "facturapiProduct_taxabilityCode_idx" ON "facturapiProduct"("taxabilityCode");

-- CreateIndex
CREATE INDEX "facturapiProduct_deletedAt_idx" ON "facturapiProduct"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiProductTax_uuid_key" ON "facturapiProductTax"("uuid");

-- CreateIndex
CREATE INDEX "facturapiProductTax_productId_idx" ON "facturapiProductTax"("productId");

-- AddForeignKey
ALTER TABLE "facturapiProduct" ADD CONSTRAINT "facturapiProduct_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturapiProduct" ADD CONSTRAINT "facturapiProduct_taxabilityCode_fkey" FOREIGN KEY ("taxabilityCode") REFERENCES "facturapiTaxabilityCatalog"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturapiProductTax" ADD CONSTRAINT "facturapiProductTax_productId_fkey" FOREIGN KEY ("productId") REFERENCES "facturapiProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
