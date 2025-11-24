# ============================================
# Dockerfile para API REST + Worker
# ============================================

FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    openssl \
    openssl-dev

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/
COPY scripts ./scripts/

# Instalar dependencias
# Usar npm install en lugar de npm ci para mayor flexibilidad
# npm ci requiere package-lock.json, npm install lo genera si no existe
RUN npm install --legacy-peer-deps

# Copiar código fuente
COPY src ./src

# Exponer puerto
EXPOSE 3000

# Comando por defecto (se puede sobrescribir en docker-compose.yml)
CMD ["npm", "run", "dev"]

