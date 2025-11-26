# 🚀 Guía de Configuración e Inicialización

Esta guía te ayudará a configurar y levantar el sistema completo de reserva de turnos médicos.

## 📋 Prerrequisitos

- **Docker** ≥ 24.x
- **Docker Compose** ≥ 2.20
- **RAM mínima**: 4 GB libres (para correr Postgres + RabbitMQ + Keycloak + Elasticsearch + Kibana + API + Worker)
- **Node.js 18+** (solo si querés correr la API/worker fuera de Docker o ejecutar scripts a mano)

## 🔧 Configuración Inicial

### 1. Variables de Entorno (Opcional)

Si quieres personalizar las variables de entorno, copia el archivo de ejemplo:

```bash
cp env.example .env
```

**Nota:** Si no creas el archivo `.env`, Docker Compose usará los valores por defecto definidos en `docker-compose.yml`. Esto es suficiente para desarrollo local.

Las variables más importantes (si las personalizas):
- `WEBHOOK_SECRET`: Secreto compartido para firmar webhooks (cambiar en producción)
- `WEBHOOK_URL`: URL del sistema externo que recibirá los webhooks (por defecto: httpbin.org para pruebas)

### 2. Levantar Servicios con Docker Compose

```bash
docker-compose up -d
```

Esto levantará automáticamente:
- PostgreSQL (puerto 5432)
- RabbitMQ (puerto 5672, Management UI en 15672)
- Keycloak (puerto 8080)
- Elasticsearch (puerto 9200)
- Kibana (puerto 5601)
- API REST (puerto 3000)
- Worker de Webhooks

**Procesos automáticos al iniciar:**

1. **API REST** (ejecuta automáticamente):
   - ✅ `prisma generate`: Genera el cliente de Prisma
   - ✅ `prisma db push`: Sincroniza el schema y crea todas las tablas y relaciones
   - ✅ `prisma db seed`: Ejecuta el seed con datos iniciales (pacientes, profesionales, horarios, turnos de ejemplo)
   - ✅ **Keycloak Setup** (ejecuta `scripts/setup-keycloak.js` después de que Keycloak esté listo):
     - ✅ Crea el Realm `health_app`
     - ✅ Crea el Client `health_app_api`
     - ✅ Crea los roles: `admin`, `professional`, `patient`
     - ✅ Crea el usuario `admin` con contraseña `admin` y rol `admin`
   - ✅ `prisma generate`: Genera el cliente de Prisma
   - ✅ `prisma db push`: Sincroniza el schema y crea todas las tablas y relaciones
   - ✅ `prisma db seed`: Ejecuta el seed con datos iniciales (pacientes, profesionales, horarios, turnos de ejemplo)

## 🧪 Probar el Sistema

### 1. Health Check

```bash
curl http://localhost:3000/api/health
```

### 2. Importar Colección de Postman

Se incluye una colección completa de Postman con todos los endpoints:

1. Abre Postman
2. Importa el archivo: `Health_Appointments_API.postman_collection.json`
3. La colección incluye:
   - ✅ Request para obtener token de Keycloak (usuario admin/admin preconfigurado)
   - ✅ Todos los endpoints de la API organizados por carpetas
   - ✅ Variables pre-configuradas
   - ✅ Tests automáticos que guardan IDs para usar en requests siguientes

**Pasos para usar:**
1. Ejecuta primero "Auth > Get Access Token" para obtener el token
2. El token se guarda automáticamente en las variables
3. Todos los demás requests usarán el token automáticamente

### 3. Probar con curl (Alternativa)

**Obtener Token de Keycloak:**
```bash
curl -X POST http://localhost:8080/realms/health_app/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" \
  -d "client_id=health_app_api"
```

**Crear un Paciente (sin autenticación):**
```bash
curl -X POST http://localhost:3000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "phone": "+54 11 1234-5678",
    "dateOfBirth": "1990-01-01"
  }'
```

**Usar el Token para Acceder a Endpoints Protegidos:**
```bash
curl http://localhost:3000/api/professionals \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 📊 Acceder a Servicios

- **API REST**: http://localhost:3000
- **Keycloak Admin Console**: http://localhost:8080 (admin/admin)
- **RabbitMQ Management**: http://localhost:15672 (health_app_user/health_app_password)
- **Kibana**: http://localhost:5601
- **Elasticsearch**: http://localhost:9200

## 🔍 Ver Logs

```bash
# Todos los servicios
docker-compose logs -f

# Solo la API
docker-compose logs -f api

# Solo el Worker
docker-compose logs -f worker

```

## 🧹 Limpiar Todo

```bash
# Detener y eliminar contenedores y volúmenes
docker-compose down -v

# Reconstruir imágenes
docker-compose build --no-cache
```

## 📝 Credenciales por Defecto

- **Keycloak Admin**: `admin` / `admin`
- **Usuario API**: `admin` / `admin` (creado automáticamente en realm `health_app`)
- **PostgreSQL**: `health_app_user` / `health_app_password`
- **RabbitMQ**: `health_app_user` / `health_app_password`

## 🐛 Troubleshooting

### Keycloak no inicia
- Verifica que PostgreSQL esté corriendo: `docker-compose ps postgres`
- Revisa los logs: `docker-compose logs keycloak`
- Espera 2-3 minutos para la inicialización completa

### Keycloak Setup falla
- Verifica que Keycloak esté corriendo: `docker-compose ps keycloak`
- Revisa los logs de la API para ver el setup: `docker-compose logs api | grep -i keycloak`
- Puede ejecutarse manualmente: `docker-compose exec api node scripts/setup-keycloak.js`

### Error de conexión a RabbitMQ
- Verifica que RabbitMQ esté saludable: `docker-compose ps rabbitmq`
- Revisa los logs: `docker-compose logs rabbitmq`

### Tablas no existen en la base de datos
- Verifica que la API haya terminado de ejecutar `prisma db push`
- Revisa los logs: `docker-compose logs api | grep -i prisma`
- Puede ejecutarse manualmente: `docker-compose exec api npx prisma db push`

### Worker no procesa mensajes
- Verifica que RabbitMQ esté corriendo
- Revisa los logs del worker: `docker-compose logs worker`
- Verifica que las colas existan en RabbitMQ Management UI: http://localhost:15672
