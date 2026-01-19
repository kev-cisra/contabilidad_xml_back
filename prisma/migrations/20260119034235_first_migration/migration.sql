-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('api', 'refresh', 'reset_password', 'verify_email', 'magic_login', 'session', 'oauth_access');

-- CreateTable
CREATE TABLE "usuario" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "email" VARCHAR(80) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "nombre" VARCHAR(150),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "secretHash" VARCHAR(255) NOT NULL,
    "type" "TokenType" NOT NULL DEFAULT 'session',
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deviceId" VARCHAR(255),
    "usuarioId" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_uuid_key" ON "usuario"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "token_uuid_key" ON "token"("uuid");

-- CreateIndex
CREATE INDEX "Token_usuarioId_fkey" ON "token"("usuarioId");

-- AddForeignKey
ALTER TABLE "token" ADD CONSTRAINT "token_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
