-- AlterTable
ALTER TABLE "usuario" ADD COLUMN     "empresaId" BIGINT;

-- CreateTable
CREATE TABLE "empresas" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "direccion" VARCHAR(255) NOT NULL,
    "email" VARCHAR(80) NOT NULL,
    "telefono" VARCHAR(15),
    "rfc" VARCHAR(13) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_uuid_key" ON "empresas"("uuid");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
