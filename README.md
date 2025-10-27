# 🏥 Sistema de Reserva de Turnos Médicos - Arquitectura BFF + Microservicios

## 🏗️ Arquitectura

Este proyecto implementa una arquitectura **Backend for Frontend (BFF)** con microservicios para la gestión de reservas de turnos médicos ambulatorios.

### Componentes del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │   Postman      │
│   (Futuro)      │    │   (Futuro)      │    │   Testing      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │      BFF Service          │
                    │   (Backend for Frontend)  │
                    │      Puerto: 3000         │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌───────▼────────┐    ┌───────────▼──────────┐    ┌────────▼────────┐
│ Patients       │    │ Professionals        │    │ Appointments    │
│ Service        │    │ Service              │    │ Service         │
│ Puerto: 3001   │    │ Puerto: 3002         │    │ Puerto: 3003   │
└───────┬────────┘    └───────────┬──────────┘    └────────┬────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │     PostgreSQL            │
                    │     Puerto: 5432          │
                    └───────────────────────────┘
```

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ 
- Docker y Docker Compose
- Git

### Instalación y Configuración

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd tp-iaew-2025
   ```

2. **Ejecutar script de inicio automático**
   ```bash
   ./start-dev.sh
   ```

3. **Iniciar servicios en modo desarrollo**
   ```bash
   # Terminal 1 - BFF Service
   cd bff && npm run dev
   
   # Terminal 2 - Patients Service
   cd services/patients && npm run dev
   
   # Terminal 3 - Professionals Service
   cd services/professionals && npm run dev
   
   # Terminal 4 - Appointments Service
   cd services/appointments && npm run dev
   ```

## 📋 Servicios Disponibles

| Servicio | Puerto | Descripción | Health Check |
|----------|--------|-------------|--------------|
| **BFF Service** | 3000 | Capa de agregación y orquestación | http://localhost:3000/health |
| **Patients Service** | 3001 | Gestión de pacientes | http://localhost:3001/health |
| **Professionals Service** | 3002 | Gestión de profesionales médicos | http://localhost:3002/health |
| **Appointments Service** | 3003 | Gestión de turnos y citas | http://localhost:3003/health |
| **PostgreSQL** | 5432 | Base de datos principal | - |

## 🔗 Endpoints Principales (BFF)

### Pacientes
- `POST /api/v1/patients` - Crear paciente
- `GET /api/v1/patients` - Listar pacientes
- `GET /api/v1/patients/:id` - Obtener paciente por ID
- `GET /api/v1/patients/dni/:dni` - Obtener paciente por DNI
- `PUT /api/v1/patients/:id` - Actualizar paciente
- `DELETE /api/v1/patients/:id` - Eliminar paciente

### Profesionales
- `POST /api/v1/professionals` - Crear profesional
- `GET /api/v1/professionals` - Listar profesionales
- `GET /api/v1/professionals/specialty/:specialty` - Por especialidad
- `GET /api/v1/professionals/:id` - Obtener por ID
- `GET /api/v1/professionals/license/:license` - Por matrícula
- `PUT /api/v1/professionals/:id` - Actualizar profesional
- `DELETE /api/v1/professionals/:id` - Eliminar profesional

### Turnos
- `POST /api/v1/appointments` - Crear turno
- `GET /api/v1/appointments` - Listar turnos
- `GET /api/v1/appointments/patient/:id` - Turnos por paciente
- `GET /api/v1/appointments/professional/:id` - Turnos por profesional
- `GET /api/v1/appointments/availability/:id` - Disponibilidad
- `GET /api/v1/appointments/:id` - Obtener turno
- `PUT /api/v1/appointments/:id` - Actualizar turno
- `DELETE /api/v1/appointments/:id` - Eliminar turno

## 🏗️ Estructura del Proyecto

```
tp-iaew-2025/
├── bff/                          # Backend for Frontend
│   ├── src/
│   │   ├── routes/              # Rutas proxy
│   │   ├── middleware/          # Middleware del BFF
│   │   └── index.ts            # Punto de entrada
│   ├── package.json
│   ├── Dockerfile
│   └── tsconfig.json
├── services/
│   ├── patients/                # Microservicio de Pacientes
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── repositories/
│   │   │   ├── routes/
│   │   │   ├── middleware/
│   │   │   ├── database/
│   │   │   ├── types/
│   │   │   └── index.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── tsconfig.json
│   ├── professionals/           # Microservicio de Profesionales
│   │   └── [estructura similar]
│   └── appointments/            # Microservicio de Turnos
│       └── [estructura similar]
├── docker-compose.yml           # Orquestación de servicios
├── start-dev.sh                # Script de inicio
└── README.md
```

## 🔧 Comandos de Desarrollo

### BFF Service
```bash
cd bff
npm run dev              # Iniciar en modo desarrollo
npm run build           # Compilar TypeScript
npm run start           # Iniciar versión compilada
```

### Microservicios
```bash
cd services/[service-name]
npm run dev              # Iniciar en modo desarrollo
npm run build           # Compilar TypeScript
npm run start           # Iniciar versión compilada
npm run db:generate     # Generar cliente Prisma
npm run db:push         # Sincronizar esquema
```

### Docker
```bash
docker-compose up -d    # Iniciar todos los servicios
docker-compose down     # Detener servicios
docker-compose logs -f  # Ver logs
docker-compose ps       # Ver estado de servicios
```

## 🧪 Testing

### Health Checks
- **BFF**: http://localhost:3000/health
- **Patients**: http://localhost:3001/health
- **Professionals**: http://localhost:3002/health
- **Appointments**: http://localhost:3003/health

### Postman Collection
Importar `postman-collection.json` para testing completo de la API.

## 🔄 Flujo de Comunicación

1. **Cliente** → **BFF Service** (Puerto 3000)
2. **BFF Service** → **Microservicio específico** (Puerto 3001/3002/3003)
3. **Microservicio** → **PostgreSQL** (Puerto 5432)
4. **Respuesta** → **BFF Service** → **Cliente**

## 🎯 Beneficios de la Arquitectura BFF

- **Agregación de datos**: El BFF combina respuestas de múltiples microservicios
- **Optimización de red**: Reduce el número de requests del frontend
- **Transformación de datos**: Adapta respuestas para necesidades específicas del frontend
- **Caché**: Implementa estrategias de caché a nivel de BFF
- **Seguridad**: Centraliza autenticación y autorización
- **Versionado**: Maneja diferentes versiones de API para diferentes clientes

## 🔮 Próximos Pasos

- [ ] Implementar autenticación con Keycloak
- [ ] Agregar RabbitMQ para eventos asincrónicos
- [ ] Configurar Kibana para logs estructurados
- [ ] Implementar webhooks
- [ ] Agregar tests unitarios y de integración
- [ ] Implementar circuit breakers
- [ ] Agregar métricas con Prometheus
- [ ] Configurar CI/CD

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

