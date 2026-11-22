FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (no ci): el lockfile se gener� en Windows y no incluye los binarios opcionales de Linux
RUN npm install --no-audit --no-fund
COPY . .
# generate solo necesita que DATABASE_URL exista, no se conecta
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate && npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
# Se conservan las devDependencies: el arranque usa la CLI de Prisma (migrate deploy y seed)
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/database ./src/database
COPY package.json prisma.config.ts docker-entrypoint.sh ./
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
