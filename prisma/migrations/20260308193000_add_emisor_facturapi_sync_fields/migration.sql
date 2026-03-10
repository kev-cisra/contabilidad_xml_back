ALTER TABLE "emisor"
ADD COLUMN "facturapiCanInvoice" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "facturapiExpiresAt" TIMESTAMP(3),
ADD COLUMN "facturapiLastSyncAt" TIMESTAMP(3),
ADD COLUMN "facturapiLastError" JSONB,
ADD COLUMN "facturapiLastErrorAt" TIMESTAMP(3),
ADD COLUMN "facturapiCustomerData" JSONB,
ADD COLUMN "facturapiOrganizationData" JSONB;

CREATE INDEX "emisor_facturapiCanInvoice_idx" ON "emisor"("facturapiCanInvoice");
CREATE INDEX "emisor_facturapiExpiresAt_idx" ON "emisor"("facturapiExpiresAt");