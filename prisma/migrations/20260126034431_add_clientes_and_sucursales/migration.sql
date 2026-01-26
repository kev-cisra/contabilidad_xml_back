/*
  Warnings:

  - Added the required column `direccion` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fielArchivo` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fielPassword` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fielPath` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `regimenFiscal` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rfc` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orden` to the `menus` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "curp" VARCHAR(18),
ADD COLUMN     "direccion" VARCHAR(255) NOT NULL,
ADD COLUMN     "email" VARCHAR(80) NOT NULL,
ADD COLUMN     "fielArchivo" VARCHAR(255) NOT NULL,
ADD COLUMN     "fielPassword" VARCHAR(255) NOT NULL,
ADD COLUMN     "fielPath" VARCHAR(255) NOT NULL,
ADD COLUMN     "regimenFiscal" VARCHAR(3) NOT NULL,
ADD COLUMN     "rfc" VARCHAR(13) NOT NULL,
ADD COLUMN     "telefono" VARCHAR(15);

-- AlterTable
ALTER TABLE "menus" ADD COLUMN     "icono" VARCHAR(100),
ADD COLUMN     "orden" INTEGER NOT NULL,
ADD COLUMN     "parentId" BIGINT,
ADD COLUMN     "ruta" VARCHAR(150);

-- CreateTable
CREATE TABLE "sucursales" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "direccion" VARCHAR(255) NOT NULL,
    "email" VARCHAR(80) NOT NULL,
    "telefono" VARCHAR(15),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sucursales_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sucursales_uuid_key" ON "sucursales"("uuid");

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;
