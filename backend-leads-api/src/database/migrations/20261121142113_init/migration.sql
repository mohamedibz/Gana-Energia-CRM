-- CreateTable
CREATE TABLE "Agente" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "rol" VARCHAR(50) NOT NULL,

    CONSTRAINT "Agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" BIGSERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "telefono" VARCHAR(30) NOT NULL,
    "estado" VARCHAR(20) NOT NULL,
    "agente_id" BIGINT,
    "cliente_nuevo" INTEGER NOT NULL,
    "interes_comercial" INTEGER NOT NULL,
    "origen" INTEGER NOT NULL,
    "antiguedad" INTEGER NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puntuacion" (
    "lead_id" BIGINT NOT NULL,
    "version" INTEGER NOT NULL,
    "puntuacion" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Puntuacion_pkey" PRIMARY KEY ("lead_id","version")
);

-- CreateTable
CREATE TABLE "Pesos" (
    "version" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "cliente_nuevo" INTEGER NOT NULL,
    "interes_comercial" INTEGER NOT NULL,
    "origen" INTEGER NOT NULL,
    "antiguedad" INTEGER NOT NULL,

    CONSTRAINT "Pesos_pkey" PRIMARY KEY ("version")
);

-- AddForeignKey
ALTER TABLE "Lead" 
ADD CONSTRAINT "Lead_agente_id_fkey" 
FOREIGN KEY ("agente_id") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puntuacion" 
ADD CONSTRAINT "Puntuacion_lead_id_fkey" 
FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Puntuacion" 
ADD CONSTRAINT "Puntuacion_version_fkey" 
FOREIGN KEY ("version") REFERENCES "Pesos"("version") ON DELETE RESTRICT ON UPDATE CASCADE;



-- AddCheckConstraints
ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_cliente_nuevo_check"
CHECK ("cliente_nuevo" BETWEEN 0 AND 100);

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_interes_comercial_check"
CHECK ("interes_comercial" BETWEEN 0 AND 100);

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_origen_check"
CHECK ("origen" BETWEEN 0 AND 100);

ALTER TABLE "Lead"
ADD CONSTRAINT "Lead_antiguedad_check"
CHECK ("antiguedad" BETWEEN 0 AND 100);


ALTER TABLE "Pesos"
ADD CONSTRAINT "Pesos_cliente_nuevo_check"
CHECK ("cliente_nuevo" BETWEEN 0 AND 100);

ALTER TABLE "Pesos"
ADD CONSTRAINT "Pesos_interes_comercial_check"
CHECK ("interes_comercial" BETWEEN 0 AND 100);

ALTER TABLE "Pesos"
ADD CONSTRAINT "Pesos_origen_check"
CHECK ("origen" BETWEEN 0 AND 100);

ALTER TABLE "Pesos"
ADD CONSTRAINT "Pesos_antiguedad_check"
CHECK ("antiguedad" BETWEEN 0 AND 100);



-- Only one active weights configuration

CREATE UNIQUE INDEX "Pesos_only_one_active_idx"
ON "Pesos" ("activo")
WHERE "activo" = true;