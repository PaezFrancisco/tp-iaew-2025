# 🚀 Guía de Inicialización

Guía paso a paso para inicializar y ejecutar el Sistema de Reserva de Turnos Médicos.

## 📋 Prerequisitos

- **Docker** 20.10+
- **Docker Compose** 2.0+

## ⚡ Pasos de Inicialización

### Paso 1: Configurar Variables de Entorno

```bash
cp env.example .env
```

### Paso 2: Iniciar Servicios

```bash
docker-compose up -d
```

Esto inicia los siguientes servicios:
- 🐘 **PostgreSQL** (puerto 5432)
- 🐰 **RabbitMQ** + Management UI (puerto 15672)
- 🔐 **Keycloak** (puerto 8080)
- 📊 **Elasticsearch** (puerto 9200)
- 📈 **Kibana** (puerto 5601)
- 🚀 **API REST** (puerto 3000)
- ⚙️ **Worker**

### Paso 3: Aplicar Migraciones de Base de Datos

```bash
docker-compose exec api npx prisma migrate deploy
```

### Paso 4: Cargar Datos Iniciales

```bash
docker-compose exec api npm run db:seed
```

### Paso 5: Verificar que Todo Funciona

```bash
curl http://localhost:3000/health
```

Deberías obtener una respuesta JSON con el estado del servicio.

## 🔍 Accesos a Servicios

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| API REST | http://localhost:3000 | - |
| RabbitMQ Management | http://localhost:15672 | `health_app_user` / `health_app_password` |
| Keycloak Admin | http://localhost:8080 | `admin` / `admin` |
| Kibana | http://localhost:5601 | - |

## 🛠️ Comandos Útiles

```bash
# Ver logs de todos los servicios
docker-compose logs -f

# Detener todos los servicios
docker-compose down

# Detener y eliminar volúmenes (limpiar todo)
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart api
```

## 📊 Datos de Prueba

Después de ejecutar el seed, se crean automáticamente:

**Pacientes:**
- juan.perez@example.com
- maria.garcia@example.com
- carlos.rodriguez@example.com

**Profesionales:**
- Dr. Roberto Silva (Medicina General)
- Dra. Ana Martínez (Cardiología)
- Dr. Pablo Fernández (Pediatría)
