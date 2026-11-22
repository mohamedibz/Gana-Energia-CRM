FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# npm install (no ci): el lockfile se generó en Windows y no incluye los binarios opcionales de Linux
RUN npm install --no-audit --no-fund
COPY . .
# La URL de la API se incrusta en el build; la consulta el navegador, no el contenedor
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
