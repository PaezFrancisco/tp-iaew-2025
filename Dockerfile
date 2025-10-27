# ============================================
# Dockerfile para API REST + Worker
# ============================================

FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY src ./src

# Exponer puerto
EXPOSE 3000

# Comando por defecto (se puede sobrescribir en docker-compose.yml)
CMD ["npm", "run", "dev"]

