/*
  Warnings:

  - You are about to drop the column `rfc` on the `empresas` table. All the data in the column will be lost.
  - You are about to drop the column `clienteId` on the `sucursales` table. All the data in the column will be lost.
  - You are about to drop the column `empresaId` on the `sucursales` table. All the data in the column will be lost.
  - You are about to drop the `clientes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `emisorId` to the `sucursales` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'past_due', 'canceled', 'expired', 'trial');

-- CreateEnum
CREATE TYPE "FacturapiEnv" AS ENUM ('test', 'live');

-- CreateEnum
CREATE TYPE "FacturapiOrgStatus" AS ENUM ('pending', 'active', 'blocked', 'disabled');

-- CreateEnum
CREATE TYPE "AuditSeverity" AS ENUM ('info', 'warn', 'critical');

-- CreateEnum
CREATE TYPE "ModuleCode" AS ENUM ('facturacion', 'import_xml', 'administracion');

-- DropForeignKey
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_empresaId_fkey";

-- DropForeignKey
ALTER TABLE "clientes" DROP CONSTRAINT "clientes_regimenFiscalId_fkey";

-- DropForeignKey
ALTER TABLE "sucursales" DROP CONSTRAINT "sucursales_clienteId_fkey";

-- DropForeignKey
ALTER TABLE "sucursales" DROP CONSTRAINT "sucursales_empresaId_fkey";

-- AlterTable
ALTER TABLE "empresas" DROP COLUMN "rfc",
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionLastPaidAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
ADD COLUMN     "userLimit" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "sucursales" DROP COLUMN "clienteId",
DROP COLUMN "empresaId",
ADD COLUMN     "emisorId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isOwner" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "clientes";

-- CreateTable
CREATE TABLE "role" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rolePermission" (
    "roleId" BIGINT NOT NULL,
    "permissionId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "usuarioRole" (
    "usuarioId" BIGINT NOT NULL,
    "roleId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "usuarioRole_pkey" PRIMARY KEY ("usuarioId","roleId")
);

-- CreateTable
CREATE TABLE "moduleCatalog" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "code" "ModuleCode" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moduleCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenantModule" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "tenantModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarioModulo" (
    "usuarioId" BIGINT NOT NULL,
    "moduleId" BIGINT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "usuarioModulo_pkey" PRIMARY KEY ("usuarioId","moduleId")
);

-- CreateTable
CREATE TABLE "auditLog" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "usuarioId" BIGINT,
    "severity" "AuditSeverity" NOT NULL DEFAULT 'info',
    "module" "ModuleCode",
    "action" VARCHAR(120) NOT NULL,
    "entity" VARCHAR(120),
    "entityId" VARCHAR(80),
    "message" VARCHAR(500),
    "meta" JSONB,
    "ip" VARCHAR(64),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptionPayment" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "amount" DECIMAL(18,2),
    "currency" VARCHAR(5),
    "provider" VARCHAR(50),
    "providerRef" VARCHAR(120),
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "userLimitAfter" INTEGER,
    "modulesSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emisor" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "empresaId" BIGINT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "razonSocial" VARCHAR(255),
    "rfc" VARCHAR(13) NOT NULL,
    "curp" VARCHAR(18),
    "regimenFiscalId" BIGINT NOT NULL,
    "codigoPostal" VARCHAR(10),
    "calle" VARCHAR(255),
    "numeroExterior" VARCHAR(10),
    "numeroInterior" VARCHAR(10),
    "colonia" VARCHAR(255),
    "municipio" VARCHAR(255),
    "estado" VARCHAR(255),
    "pais" VARCHAR(3),
    "email" VARCHAR(80),
    "telefono" VARCHAR(15),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "emisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receptor" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "emisorId" BIGINT NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "rfc" VARCHAR(13) NOT NULL,
    "email" VARCHAR(80),
    "usoCfdi" VARCHAR(10),
    "codigoPostal" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "receptor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturapiOrganization" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "emisorId" BIGINT NOT NULL,
    "facturapiId" VARCHAR(80) NOT NULL,
    "status" "FacturapiOrgStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facturapiOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturapiApiKey" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "emisorId" BIGINT NOT NULL,
    "env" "FacturapiEnv" NOT NULL,
    "secretRef" VARCHAR(255) NOT NULL,
    "last4" VARCHAR(4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "facturapiApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facturapiCertificate" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "emisorId" BIGINT NOT NULL,
    "env" "FacturapiEnv" NOT NULL,
    "facturapiCertId" VARCHAR(80),
    "cerPath" VARCHAR(255),
    "keyPath" VARCHAR(255),
    "keyPassEnc" VARCHAR(255),
    "serialNumber" VARCHAR(40),
    "validFrom" TIMESTAMP(3),
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "facturapiCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfdiInvoice" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "emisorId" BIGINT NOT NULL,
    "receptorId" BIGINT,
    "env" "FacturapiEnv" NOT NULL,
    "facturapiId" VARCHAR(80),
    "serie" VARCHAR(10),
    "folio" VARCHAR(20),
    "status" VARCHAR(30),
    "total" DECIMAL(18,2),
    "currency" VARCHAR(5),
    "paymentForm" VARCHAR(5),
    "paymentMethod" VARCHAR(5),
    "usoCfdi" VARCHAR(10),
    "tipoComprobante" VARCHAR(2),
    "issuedAt" TIMESTAMP(3),
    "pdfUrl" VARCHAR(500),
    "xmlUrl" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "cfdiInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cfdiInvoiceItem" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "invoiceId" BIGINT NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "productKey" VARCHAR(20),
    "unitKey" VARCHAR(10),
    "quantity" DECIMAL(18,6) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cfdiInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "role_uuid_key" ON "role"("uuid");

-- CreateIndex
CREATE INDEX "role_empresaId_idx" ON "role"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "role_empresaId_name_key" ON "role"("empresaId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "permission_uuid_key" ON "permission"("uuid");

-- CreateIndex
CREATE INDEX "permission_empresaId_idx" ON "permission"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "permission_empresaId_name_key" ON "permission"("empresaId", "name");

-- CreateIndex
CREATE INDEX "rolePermission_roleId_idx" ON "rolePermission"("roleId");

-- CreateIndex
CREATE INDEX "rolePermission_permissionId_idx" ON "rolePermission"("permissionId");

-- CreateIndex
CREATE INDEX "usuarioRole_usuarioId_idx" ON "usuarioRole"("usuarioId");

-- CreateIndex
CREATE INDEX "usuarioRole_roleId_idx" ON "usuarioRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "moduleCatalog_uuid_key" ON "moduleCatalog"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "moduleCatalog_code_key" ON "moduleCatalog"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tenantModule_uuid_key" ON "tenantModule"("uuid");

-- CreateIndex
CREATE INDEX "tenantModule_empresaId_idx" ON "tenantModule"("empresaId");

-- CreateIndex
CREATE INDEX "tenantModule_moduleId_idx" ON "tenantModule"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "tenantModule_empresaId_moduleId_key" ON "tenantModule"("empresaId", "moduleId");

-- CreateIndex
CREATE INDEX "usuarioModulo_usuarioId_idx" ON "usuarioModulo"("usuarioId");

-- CreateIndex
CREATE INDEX "usuarioModulo_moduleId_idx" ON "usuarioModulo"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "auditLog_uuid_key" ON "auditLog"("uuid");

-- CreateIndex
CREATE INDEX "auditLog_empresaId_createdAt_idx" ON "auditLog"("empresaId", "createdAt");

-- CreateIndex
CREATE INDEX "auditLog_usuarioId_createdAt_idx" ON "auditLog"("usuarioId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptionPayment_uuid_key" ON "subscriptionPayment"("uuid");

-- CreateIndex
CREATE INDEX "subscriptionPayment_empresaId_paidAt_idx" ON "subscriptionPayment"("empresaId", "paidAt");

-- CreateIndex
CREATE UNIQUE INDEX "emisor_uuid_key" ON "emisor"("uuid");

-- CreateIndex
CREATE INDEX "emisor_empresaId_idx" ON "emisor"("empresaId");

-- CreateIndex
CREATE INDEX "emisor_regimenFiscalId_idx" ON "emisor"("regimenFiscalId");

-- CreateIndex
CREATE UNIQUE INDEX "emisor_empresaId_rfc_key" ON "emisor"("empresaId", "rfc");

-- CreateIndex
CREATE UNIQUE INDEX "receptor_uuid_key" ON "receptor"("uuid");

-- CreateIndex
CREATE INDEX "receptor_emisorId_idx" ON "receptor"("emisorId");

-- CreateIndex
CREATE UNIQUE INDEX "receptor_emisorId_rfc_key" ON "receptor"("emisorId", "rfc");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiOrganization_uuid_key" ON "facturapiOrganization"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiOrganization_emisorId_key" ON "facturapiOrganization"("emisorId");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiOrganization_facturapiId_key" ON "facturapiOrganization"("facturapiId");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiApiKey_uuid_key" ON "facturapiApiKey"("uuid");

-- CreateIndex
CREATE INDEX "facturapiApiKey_emisorId_idx" ON "facturapiApiKey"("emisorId");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiApiKey_emisorId_env_key" ON "facturapiApiKey"("emisorId", "env");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiCertificate_uuid_key" ON "facturapiCertificate"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "facturapiCertificate_facturapiCertId_key" ON "facturapiCertificate"("facturapiCertId");

-- CreateIndex
CREATE INDEX "facturapiCertificate_emisorId_env_idx" ON "facturapiCertificate"("emisorId", "env");

-- CreateIndex
CREATE UNIQUE INDEX "cfdiInvoice_uuid_key" ON "cfdiInvoice"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "cfdiInvoice_facturapiId_key" ON "cfdiInvoice"("facturapiId");

-- CreateIndex
CREATE INDEX "cfdiInvoice_emisorId_env_idx" ON "cfdiInvoice"("emisorId", "env");

-- CreateIndex
CREATE INDEX "cfdiInvoice_receptorId_idx" ON "cfdiInvoice"("receptorId");

-- CreateIndex
CREATE UNIQUE INDEX "cfdiInvoiceItem_uuid_key" ON "cfdiInvoiceItem"("uuid");

-- CreateIndex
CREATE INDEX "cfdiInvoiceItem_invoiceId_idx" ON "cfdiInvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "empresas_subscriptionExpiresAt_idx" ON "empresas"("subscriptionExpiresAt");

-- CreateIndex
CREATE INDEX "menus_empresaId_idx" ON "menus"("empresaId");

-- CreateIndex
CREATE INDEX "sucursales_emisorId_idx" ON "sucursales"("emisorId");

-- CreateIndex
CREATE INDEX "usuario_empresaId_idx" ON "usuario"("empresaId");

-- AddForeignKey
ALTER TABLE "role" ADD CONSTRAINT "role_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission" ADD CONSTRAINT "permission_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rolePermission" ADD CONSTRAINT "rolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rolePermission" ADD CONSTRAINT "rolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarioRole" ADD CONSTRAINT "usuarioRole_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarioRole" ADD CONSTRAINT "usuarioRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenantModule" ADD CONSTRAINT "tenantModule_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenantModule" ADD CONSTRAINT "tenantModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "moduleCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarioModulo" ADD CONSTRAINT "usuarioModulo_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarioModulo" ADD CONSTRAINT "usuarioModulo_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "moduleCatalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditLog" ADD CONSTRAINT "auditLog_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditLog" ADD CONSTRAINT "auditLog_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptionPayment" ADD CONSTRAINT "subscriptionPayment_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emisor" ADD CONSTRAINT "emisor_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emisor" ADD CONSTRAINT "emisor_regimenFiscalId_fkey" FOREIGN KEY ("regimenFiscalId") REFERENCES "regimenFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receptor" ADD CONSTRAINT "receptor_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturapiOrganization" ADD CONSTRAINT "facturapiOrganization_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturapiApiKey" ADD CONSTRAINT "facturapiApiKey_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facturapiCertificate" ADD CONSTRAINT "facturapiCertificate_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdiInvoice" ADD CONSTRAINT "cfdiInvoice_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdiInvoice" ADD CONSTRAINT "cfdiInvoice_receptorId_fkey" FOREIGN KEY ("receptorId") REFERENCES "receptor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cfdiInvoiceItem" ADD CONSTRAINT "cfdiInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "cfdiInvoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
