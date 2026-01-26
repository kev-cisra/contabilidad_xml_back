/*
  Warnings:

  - You are about to drop the `modulos` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `rolePermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarioModulo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `usuarioRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "rolePermission" DROP CONSTRAINT "rolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "rolePermission" DROP CONSTRAINT "rolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "usuarioModulo" DROP CONSTRAINT "usuarioModulo_moduloId_fkey";

-- DropForeignKey
ALTER TABLE "usuarioModulo" DROP CONSTRAINT "usuarioModulo_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "usuarioRole" DROP CONSTRAINT "usuarioRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "usuarioRole" DROP CONSTRAINT "usuarioRole_usuarioId_fkey";

-- DropTable
DROP TABLE "modulos";

-- DropTable
DROP TABLE "permission";

-- DropTable
DROP TABLE "role";

-- DropTable
DROP TABLE "rolePermission";

-- DropTable
DROP TABLE "usuarioModulo";

-- DropTable
DROP TABLE "usuarioRole";

-- CreateTable
CREATE TABLE "menus" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "menus_uuid_key" ON "menus"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "menus_nombre_key" ON "menus"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_uuid_key" ON "clientes"("uuid");
