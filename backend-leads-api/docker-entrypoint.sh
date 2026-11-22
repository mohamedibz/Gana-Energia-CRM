#!/bin/sh
set -e

echo "Aplicando migraciones..."
npx prisma migrate deploy

# El seed borra los datos existentes, por eso solo se ejecuta con la base vacía
EMPTY=$(node -e '
const { Client } = require("pg");
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.query("SELECT count(*)::int AS n FROM \"Agente\""))
  .then((r) => { console.log(r.rows[0].n === 0 ? "yes" : "no"); return c.end(); })
  .catch((e) => { console.error(e); process.exit(1); });
')

if [ "$EMPTY" = "yes" ] && [ "${SEED_ON_EMPTY:-true}" = "true" ]; then
  echo "Base de datos vacía: cargando datos de ejemplo..."
  npx prisma db execute --file src/database/seed.sql
fi

exec "$@"
