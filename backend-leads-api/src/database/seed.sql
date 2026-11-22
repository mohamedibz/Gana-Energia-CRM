-- Datos de ejemplo. Borra los datos existentes y los vuelve a crear: npm run seed

TRUNCATE TABLE "Puntuacion", "Lead", "Pesos", "Agente" RESTART IDENTITY CASCADE;

-- Agentes (el id 1 es administrador). Contraseñas de demo, guardadas con hash scrypt:
--   600000001 / Admin-2026      600000002 / Agente2-2026      600000003 / Agente3-2026
INSERT INTO "Agente" ("nombre", "rol", "telefono", "password_hash") VALUES
  ('Agente 01', 'ADMIN',  '600000001', '4f523ea8f4a79e61f743e2669e265239:eda845ce5abe314f71f30a6b2fe8968b8a6fb3bc0726e76977766f3f7f747d3594638c330c9b51089a904b849ae6a1375a2db631e1ac8e9a3b79aed7e1ae97e3'),
  ('Agente 02', 'AGENTE', '600000002', 'f5ca4b139adcaecf1d31bd0c51a565dd:e5c92fb985e2f7aa0150fea687471d2f1f10991b933071fe491d83be89e98a9c38eabda698939fc669fa3bdafaeea2feb85ef2b2543078e09bfb98be94ffbf87'),
  ('Agente 03', 'AGENTE', '600000003', '5a8b95dc3b66ac43aadc7740f42384e8:2add4f3bda76eec728f526e66f31c6796ce93b12f7ef2b5fc64977daf542ada8e8eaef1d11b91c687b28a371b61326504db8fed5083a4197ef0287ac0a636e6e');

-- Pesos iniciales: 40 / 30 / 20 / 10 (creados por el administrador)
INSERT INTO "Pesos" ("activo", "cliente_nuevo", "interes_comercial", "origen", "antiguedad", "creado_por_id", "modificado_por_id")
VALUES (true, 40, 30, 20, 10, 1, 1);

-- 500 leads con datos aleatorios; aproximadamente un tercio sin agente asignado
INSERT INTO "Lead" ("nombre", "telefono", "estado", "agente_id", "cliente_nuevo", "interes_comercial", "origen", "antiguedad")
SELECT
  (ARRAY['Ana','Luis','María','Carlos','Lucía','Pedro','Laura','Javier','Elena','Miguel'])[1 + floor(random() * 10)::int]
    || ' ' ||
  (ARRAY['Torres','Pérez','Ruiz','García','López','Martín','Sánchez','Gómez','Díaz','Moreno'])[1 + floor(random() * 10)::int]
    || ' ' || n,
  '6' || lpad(floor(random() * 100000000)::text, 8, '0'),
  (ARRAY['NUEVO','EN_GESTION','CONTACTADO','CERRADO'])[1 + floor(random() * 4)::int],
  CASE WHEN random() < 0.33 THEN NULL ELSE 1 + floor(random() * 3)::int END,
  floor(random() * 101)::int,
  floor(random() * 101)::int,
  floor(random() * 101)::int,
  floor(random() * 101)::int
FROM generate_series(1, 500) AS n;

-- Puntuación de cada lead con los pesos activos (misma fórmula que la aplicación)
INSERT INTO "Puntuacion" ("lead_id", "version", "puntuacion")
SELECT
  l.id,
  w.version,
  (
    l.cliente_nuevo * w.cliente_nuevo +
    l.interes_comercial * w.interes_comercial +
    l.origen * w.origen +
    l.antiguedad * w.antiguedad
  )::float8 / 100
FROM "Lead" l
CROSS JOIN "Pesos" w
WHERE w.activo = true;
