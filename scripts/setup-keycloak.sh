#!/bin/sh
set -e

KEYCLOAK_URL="${KEYCLOAK_URL:-http://keycloak:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-health_app}"
KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-health_app_api}"

echo "🔐 Configurando Keycloak..."

# Esperar a que Keycloak esté listo
echo "⏳ Esperando a que Keycloak esté disponible..."
until curl -f -s "${KEYCLOAK_URL}/health/ready" > /dev/null 2>&1; do
  echo "   Esperando..."
  sleep 2
done
echo "✅ Keycloak está disponible"

# Obtener token de administrador
echo "🔑 Obteniendo token de administrador..."
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error obteniendo token de administrador"
  exit 1
fi
echo "✅ Token obtenido"

# Crear Realm
echo "🌍 Creando Realm: ${KEYCLOAK_REALM}..."
REALM_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

if [ "$REALM_EXISTS" != "200" ]; then
  curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"realm\": \"${KEYCLOAK_REALM}\",
      \"enabled\": true,
      \"displayName\": \"Health Appointments System\"
    }" > /dev/null
  echo "✅ Realm creado"
else
  echo "ℹ️  Realm ya existe"
fi

# Crear Client
echo "🔧 Creando Client: ${KEYCLOAK_CLIENT_ID}..."
CLIENT_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${KEYCLOAK_CLIENT_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

if [ "$CLIENT_EXISTS" != "200" ]; then
  curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"clientId\": \"${KEYCLOAK_CLIENT_ID}\",
      \"enabled\": true,
      \"protocol\": \"openid-connect\",
      \"publicClient\": true,
      \"standardFlowEnabled\": true,
      \"directAccessGrantsEnabled\": true,
      \"redirectUris\": [\"*\"],
      \"webOrigins\": [\"*\"]
    }" > /dev/null
  echo "✅ Client creado"
else
  echo "ℹ️  Client ya existe"
fi

# Crear Roles
echo "👥 Creando roles..."
for ROLE in admin professional patient; do
  ROLE_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${ROLE}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}")
  
  if [ "$ROLE_EXISTS" != "200" ]; then
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles" \
      -H "Authorization: Bearer ${ADMIN_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{\"name\": \"${ROLE}\"}" > /dev/null
    echo "   ✅ Rol '${ROLE}' creado"
  else
    echo "   ℹ️  Rol '${ROLE}' ya existe"
  fi
done

# Crear usuario admin
echo "👤 Creando usuario admin..."
USER_EXISTS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=admin" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")

if [ "$USER_EXISTS" != "200" ]; then
  # Crear usuario
  USER_ID=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
      \"username\": \"admin\",
      \"email\": \"admin@healthapp.com\",
      \"enabled\": true,
      \"emailVerified\": true,
      \"credentials\": [{
        \"type\": \"password\",
        \"value\": \"admin\",
        \"temporary\": false
      }]
    }" | jq -r '.id')
  
  # Asignar roles
  ROLE_ADMIN_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/admin" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq -r '.id')
  
  curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "[{\"id\": \"${ROLE_ADMIN_ID}\", \"name\": \"admin\"}]" > /dev/null
  
  echo "✅ Usuario 'admin' creado con contraseña 'admin' y rol 'admin'"
else
  echo "ℹ️  Usuario 'admin' ya existe"
fi

echo "✨ Configuración de Keycloak completada!"
echo ""
echo "📝 Credenciales:"
echo "   Usuario: admin"
echo "   Contraseña: admin"
echo "   Realm: ${KEYCLOAK_REALM}"
echo "   Client ID: ${KEYCLOAK_CLIENT_ID}"

