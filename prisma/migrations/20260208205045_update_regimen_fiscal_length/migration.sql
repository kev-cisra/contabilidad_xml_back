/*
  Warnings:

  - Added the required column `empresaId` to the `clientes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `menus` table without a default value. This is not possible if the table is not empty.
  - Added the required column `empresaId` to the `sucursales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "clientes" ADD COLUMN     "empresaId" BIGINT NOT NULL,
ALTER COLUMN "regimenFiscal" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "menus" ADD COLUMN     "empresaId" BIGINT NOT NULL;

-- AlterTable
ALTER TABLE "sucursales" ADD COLUMN     "empresaId" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "menus" ADD CONSTRAINT "menus_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
