-- Fechas y agente que creó / modificó cada versión de los pesos.
-- Las versiones anteriores quedan sin agente (NULL) y con la fecha de la migración.
-- AlterTable
ALTER TABLE "Pesos" ADD COLUMN     "creado_por_id" BIGINT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "modificado_por_id" BIGINT,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Pesos" ADD CONSTRAINT "Pesos_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pesos" ADD CONSTRAINT "Pesos_modificado_por_id_fkey" FOREIGN KEY ("modificado_por_id") REFERENCES "Agente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
