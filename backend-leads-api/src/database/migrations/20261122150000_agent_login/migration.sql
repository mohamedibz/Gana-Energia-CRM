-- Login por teléfono y contraseña. Los agentes que ya existan reciben valores
-- provisionales (el hash vacío no coincide con ninguna contraseña); npm run seed los reemplaza.
ALTER TABLE "Agente"
ADD COLUMN "telefono" VARCHAR(30),
ADD COLUMN "password_hash" VARCHAR(255);

UPDATE "Agente"
SET "telefono" = 'sin-telefono-' || "id",
    "password_hash" = '';

ALTER TABLE "Agente"
ALTER COLUMN "telefono" SET NOT NULL,
ALTER COLUMN "password_hash" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Agente_telefono_key" ON "Agente"("telefono");
