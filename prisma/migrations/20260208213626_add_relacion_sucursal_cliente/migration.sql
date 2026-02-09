-- AlterTable
ALTER TABLE "sucursales" ADD COLUMN     "clienteId" BIGINT;

-- AddForeignKey
ALTER TABLE "sucursales" ADD CONSTRAINT "sucursales_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
