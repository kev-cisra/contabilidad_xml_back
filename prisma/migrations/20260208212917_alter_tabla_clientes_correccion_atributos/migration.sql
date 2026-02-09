/*
  Warnings:

  - You are about to drop the column `direccion` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `telefono` on the `clientes` table. All the data in the column will be lost.
  - You are about to drop the column `direccion` on the `sucursales` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[rfc]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[curp]` on the table `clientes` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `calle` to the `sucursales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `codigoPostal` to the `sucursales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `colonia` to the `sucursales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `estado` to the `sucursales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `municipio` to the `sucursales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clientes" DROP COLUMN "direccion",
DROP COLUMN "email",
DROP COLUMN "telefono",
ALTER COLUMN "fielArchivo" DROP NOT NULL,
ALTER COLUMN "fielPassword" DROP NOT NULL,
ALTER COLUMN "fielPath" DROP NOT NULL;

-- AlterTable
ALTER TABLE "sucursales" DROP COLUMN "direccion",
ADD COLUMN     "calle" VARCHAR(255) NOT NULL,
ADD COLUMN     "codigoPostal" VARCHAR(10) NOT NULL,
ADD COLUMN     "colonia" VARCHAR(255) NOT NULL,
ADD COLUMN     "estado" VARCHAR(255) NOT NULL,
ADD COLUMN     "municipio" VARCHAR(255) NOT NULL,
ADD COLUMN     "numeroExterior" VARCHAR(10),
ADD COLUMN     "numeroInterior" VARCHAR(10);

-- CreateIndex
CREATE UNIQUE INDEX "clientes_rfc_key" ON "clientes"("rfc");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_curp_key" ON "clientes"("curp");
