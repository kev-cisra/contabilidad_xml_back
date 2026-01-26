/*
  Warnings:

  - Made the column `empresaId` on table `usuario` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "usuario" DROP CONSTRAINT "usuario_empresaId_fkey";

-- AlterTable
ALTER TABLE "usuario" ALTER COLUMN "empresaId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
