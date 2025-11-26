#!/bin/sh
# No usar set -e para que los errores no detengan el script

echo "🚀 Iniciando configuración de la API..."

# 1. Generar Prisma Client
echo "📦 Generando Prisma Client..."
if ! npx prisma generate; then
  echo "❌ Error generando Prisma Client, pero continuando..."
fi

# 2. Aplicar migraciones y seed
echo "🗄️  Aplicando migraciones..."
if ! npx prisma db push --accept-data-loss; then
  echo "❌ Error aplicando migraciones, pero continuando..."
fi

echo "🌱 Ejecutando seed..."
if ! npx prisma db seed; then
  echo "⚠️  Seed falló, continuando..."
fi

# 3. Esperar a que Keycloak esté completamente listo
echo "⏳ Esperando a que Keycloak esté completamente listo..."
MAX_RETRIES=15
RETRY_COUNT=0
KEYCLOAK_READY=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Verificar que Keycloak responda y que el realm master esté disponible
  # Esto indica que Keycloak está completamente inicializado
  if wget -q -O- "http://keycloak:8080/realms/master/.well-known/openid-configuration" > /dev/null 2>&1; then
    echo "✅ Keycloak está completamente inicializado"
    KEYCLOAK_READY=true
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $((RETRY_COUNT % 3)) -eq 0 ]; then
    echo "   Esperando... (${RETRY_COUNT}/${MAX_RETRIES})"
  fi
  sleep 2
done

if [ "$KEYCLOAK_READY" = "false" ]; then
  echo "⚠️  Keycloak no está completamente listo después de ${MAX_RETRIES} intentos"
  echo "   Continuando de todas formas - el script de setup esperará nuevamente"
fi

# 4. Configurar Keycloak (solo si es necesario)
echo "🔐 Configurando Keycloak..."
if node scripts/setup-keycloak.js; then
  echo "✅ Keycloak configurado correctamente"
else
  echo "⚠️  Error configurando Keycloak, pero continuando..."
  echo "   Puede que ya esté configurado o haya un problema temporal"
  echo "   La API intentará continuar de todas formas"
fi

# 5. Verificar que el realm esté configurado antes de continuar
echo "🔍 Verificando configuración del realm..."
MAX_VERIFY_RETRIES=10
VERIFY_COUNT=0
REALM_READY=false

while [ $VERIFY_COUNT -lt $MAX_VERIFY_RETRIES ]; do
  if wget -q -O- "http://keycloak:8080/realms/health_app/.well-known/openid-configuration" > /dev/null 2>&1; then
    echo "✅ Realm está configurado y accesible"
    REALM_READY=true
    break
  fi
  VERIFY_COUNT=$((VERIFY_COUNT + 1))
  sleep 2
done

if [ "$REALM_READY" = "false" ]; then
  echo "⚠️  No se pudo verificar el realm, pero continuando..."
fi

# 6. Iniciar la API
echo "🚀 Iniciando servidor API..."
exec npm run dev