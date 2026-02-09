-- AlterEnum
ALTER TYPE "TipoPersona" ADD VALUE 'ambas';

-- AlterTable
ALTER TABLE "regimenFiscal" ADD COLUMN     "FechaFin" TIMESTAMP(3),
ADD COLUMN     "fechaInicio" TIMESTAMP(3);
