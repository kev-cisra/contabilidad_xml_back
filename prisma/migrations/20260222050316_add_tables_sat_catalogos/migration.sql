-- CreateTable
CREATE TABLE "satFormaPago" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satFormaPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satMetodoPago" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satMetodoPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satUsoCfdi" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satUsoCfdi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satUsoCfdiRegimenFiscal" (
    "usoCfdiId" BIGINT NOT NULL,
    "regimenFiscalId" BIGINT NOT NULL,

    CONSTRAINT "satUsoCfdiRegimenFiscal_pkey" PRIMARY KEY ("usoCfdiId","regimenFiscalId")
);

-- CreateTable
CREATE TABLE "satRelacionCfdi" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satRelacionCfdi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satMesBimestre" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satMesBimestre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoContrato" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoContrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoJornada" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoJornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoRegimenNomina" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoRegimenNomina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satRiesgoPuesto" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satRiesgoPuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satPeriodicidadPago" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satPeriodicidadPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoPercepcion" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoPercepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoHoras" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoHoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoDeduccion" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoDeduccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoOtroPago" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoOtroPago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satTipoIncapacidad" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satTipoIncapacidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "satClaveRetencion" (
    "id" BIGSERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "clave" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "satClaveRetencion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "satFormaPago_uuid_key" ON "satFormaPago"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satFormaPago_clave_key" ON "satFormaPago"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satMetodoPago_uuid_key" ON "satMetodoPago"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satMetodoPago_clave_key" ON "satMetodoPago"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satUsoCfdi_uuid_key" ON "satUsoCfdi"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satUsoCfdi_clave_key" ON "satUsoCfdi"("clave");

-- CreateIndex
CREATE INDEX "satUsoCfdiRegimenFiscal_regimenFiscalId_idx" ON "satUsoCfdiRegimenFiscal"("regimenFiscalId");

-- CreateIndex
CREATE UNIQUE INDEX "satRelacionCfdi_uuid_key" ON "satRelacionCfdi"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satRelacionCfdi_clave_key" ON "satRelacionCfdi"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satMesBimestre_uuid_key" ON "satMesBimestre"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satMesBimestre_clave_key" ON "satMesBimestre"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoContrato_uuid_key" ON "satTipoContrato"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoContrato_clave_key" ON "satTipoContrato"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoJornada_uuid_key" ON "satTipoJornada"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoJornada_clave_key" ON "satTipoJornada"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoRegimenNomina_uuid_key" ON "satTipoRegimenNomina"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoRegimenNomina_clave_key" ON "satTipoRegimenNomina"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satRiesgoPuesto_uuid_key" ON "satRiesgoPuesto"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satRiesgoPuesto_clave_key" ON "satRiesgoPuesto"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satPeriodicidadPago_uuid_key" ON "satPeriodicidadPago"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satPeriodicidadPago_clave_key" ON "satPeriodicidadPago"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoPercepcion_uuid_key" ON "satTipoPercepcion"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoPercepcion_clave_key" ON "satTipoPercepcion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoHoras_uuid_key" ON "satTipoHoras"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoHoras_clave_key" ON "satTipoHoras"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoDeduccion_uuid_key" ON "satTipoDeduccion"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoDeduccion_clave_key" ON "satTipoDeduccion"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoOtroPago_uuid_key" ON "satTipoOtroPago"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoOtroPago_clave_key" ON "satTipoOtroPago"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoIncapacidad_uuid_key" ON "satTipoIncapacidad"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satTipoIncapacidad_clave_key" ON "satTipoIncapacidad"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "satClaveRetencion_uuid_key" ON "satClaveRetencion"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "satClaveRetencion_clave_key" ON "satClaveRetencion"("clave");

-- AddForeignKey
ALTER TABLE "satUsoCfdiRegimenFiscal" ADD CONSTRAINT "satUsoCfdiRegimenFiscal_usoCfdiId_fkey" FOREIGN KEY ("usoCfdiId") REFERENCES "satUsoCfdi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "satUsoCfdiRegimenFiscal" ADD CONSTRAINT "satUsoCfdiRegimenFiscal_regimenFiscalId_fkey" FOREIGN KEY ("regimenFiscalId") REFERENCES "regimenFiscal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
