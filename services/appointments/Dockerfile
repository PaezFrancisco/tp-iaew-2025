# Dockerfile para Appointments Service
FROM node:18-alpine

# Instalar curl para health checks
RUN apk add --no-cache curl

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY src/ ./src/
COPY prisma/ ./prisma/

# Generar cliente de Prisma
RUN npx prisma generate

# Exponer puerto
EXPOSE 3003

# Comando por defecto
CMD ["npm", "run", "dev"]

