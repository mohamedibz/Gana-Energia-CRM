-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Lead_estado_idx" ON "Lead"("estado");

-- CreateIndex
CREATE INDEX "Lead_agente_id_idx" ON "Lead"("agente_id");

-- CreateIndex
CREATE INDEX "Puntuacion_version_puntuacion_lead_id_idx" ON "Puntuacion"("version", "puntuacion" DESC, "lead_id");
