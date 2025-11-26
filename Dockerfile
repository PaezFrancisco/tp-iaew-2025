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
RUN npm install --legacy-peer-deps

COPY src ./src

EXPOSE 3000

CMD ["npm", "run", "dev"]

