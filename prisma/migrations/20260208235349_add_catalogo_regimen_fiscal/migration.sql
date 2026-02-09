/*
  Warnings:

  - You are about to drop the column `regimenFiscal` on the `clientes` table. All the data in the column will be lost.
  - Added the required column `regimenFiscalId` to the `clientes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('fisica', 'moral');

-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "regimenFiscal",
ADD COLUMN     "regimenFiscalId" BIGINT NOT NULL,
ALTER COLUMN "rfc" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sucursales" ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "calle" DROP NOT NULL,
ALTER COLUMN "codigoPostal" DROP NOT NULL,
ALTER COLUMN "colonia" DROP NOT NULL,
ALTER COLUMN "estado" DROP NOT NULL,
ALTER COLUMN "municipio" DROP NOT NULL;

-- CreateTable
CREATE TABLE "regimenFiscal" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "tipoPersona" "TipoPersona" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "regimenFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regimenFiscal_uuid_key" ON "regimenFiscal"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "regimenFiscal_clave_key" ON "regimenFiscal"("clave");

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_regimenFiscalId_fkey" FOREIGN KEY ("regimenFiscalId") REFERENCES "regimenFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
