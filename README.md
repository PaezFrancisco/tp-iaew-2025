# 🏥 Sistema de Reserva de Turnos de Salud Ambulatoria

**Versión:** v1.0.0  
**Último commit:** `02c19a1f1e9045150591120d5d5952fc50fe752d`

## 📘 Proyecto y Dominio

El proyecto consiste en el desarrollo de una **API REST** para la **gestión de reservas de turnos médicos ambulatorios**, permitiendo a los pacientes consultar la disponibilidad de profesionales, reservar turnos y recibir recordatorios automáticos.

**Scope del proyecto:** Solo desarrollo de APIs REST, sin frontend. Los clientes interactuarán mediante requests HTTP directos o herramientas como Postman.

El sistema contempla:
- **Entidades principales:** Paciente, Profesional (con agenda)
- **Transacción clave:** Reserva de turno (verificación de disponibilidad, bloqueo temporal y confirmación)
- **Asincronía:** Recordatorios automáticos con reintentos
- **Integración:** Webhook de confirmación/cancelación
- **Seguridad:** OAuth2 + JWT con Keycloak
- **Base de datos:** PostgreSQL con Prisma ORM
- **Comunicación asíncrona:** RabbitMQ
- **Contenedores:** Docker + Docker Compose
- **Observabilidad:** Logs estructurados con Kibana
- **Pruebas:** colección de Postman
## Nivel 1: Contexto del Sistema

Este diagrama muestra el sistema de reserva de turnos médicos en su contexto más amplio, identificando los usuarios principales y los sistemas externos con los que interactúa.

```mermaid
graph TB
    subgraph "Clientes API"
        Patient[Paciente<br/>HTTP Requests<br/>Postman/Cliente HTTP]
        Professional[Profesional Médico<br/>HTTP Requests<br/>Postman/Cliente HTTP]
    end
    
    subgraph "Sistema Principal"
        System[Sistema de Reserva<br/>de Turnos Médicos<br/><br/>API REST<br/>Solo backend - Sin frontend]
    end
    
    subgraph "Sistemas Externos"
        AuthProvider[Keycloak<br/><br/>OAuth2 Provider<br/>Autenticación y autorización]
        ExternalSystem[Sistema Externo<br/><br/>Webhook HTTP POST<br/>Confirmaciones/Cancelaciones]
    end
    
    Patient -->|"POST /appointments<br/>GET /availability<br/>DELETE /appointments"| System
    Professional -->|"GET /appointments<br/>PUT /schedule<br/>GET /dashboard"| System
    
    System -->|"JWT Validation<br/>JWKS Endpoint"| AuthProvider
    System -->|"HTTP POST<br/>Webhook Events"| ExternalSystem
```

## Nivel 2: Contenedores del Sistema

Este diagrama descompone el sistema en sus principales contenedores, mostrando las responsabilidades de cada uno y cómo se comunican entre sí según las decisiones arquitectónicas tomadas.

```mermaid
graph TB
    subgraph "Clientes API"
        Patient[Paciente<br/>HTTP Client<br/>Postman/Requests]
        Professional[Profesional Médico<br/>HTTP Client<br/>Postman/Requests]
    end
    
    subgraph "Sistema de Reserva de Turnos"
        API[API REST<br/><br/>Node.js + Express + TypeScript<br/>Endpoints REST<br/>Validación JWT]
        Worker[Worker de Recordatorios<br/><br/>Node.js<br/>Consumidor RabbitMQ<br/>Reintentos automáticos]
    end
    
    subgraph "Almacenamiento y Comunicación"
        Database[(PostgreSQL<br/><br/>Transacciones ACID<br/>Prisma ORM<br/>Migraciones automáticas)]
        MessageBroker[RabbitMQ<br/><br/>Colas de mensajes<br/>Reintentos y colas diferidas<br/>Patrón Producer-Consumer]
    end
    
    subgraph "Servicios Externos"
        AuthProvider[Keycloak<br/><br/>OAuth2 Provider<br/>Validación JWT<br/>JWKS Endpoint]
        ExternalSystem[Sistema Externo<br/><br/>Webhook HTTP POST<br/>Confirmaciones/Cancelaciones]
        Kibana[Kibana<br/><br/>Logs estructurados<br/>Análisis y visualización]
    end
    
    Patient -->|"HTTPS<br/>REST API"| API
    Professional -->|"HTTPS<br/>REST API"| API
    
    API -->|"SQL Transaccional<br/>Prisma ORM"| Database
    API -->|"AMQP<br/>Publish Events"| MessageBroker
    API -->|"HTTPS<br/>JWT Validation"| AuthProvider
    API -->|"HTTP<br/>Structured Logs"| Kibana
    
    Worker -->|"AMQP<br/>Consume Messages"| MessageBroker
    Worker -->|"SQL<br/>Read Appointments"| Database
    Worker -->|"HTTP POST<br/>Webhook"| ExternalSystem
    Worker -->|"HTTP<br/>Structured Logs"| Kibana
```

## Nivel 3: Componentes de la API

Este diagrama muestra los componentes internos del contenedor API REST, implementando las decisiones arquitectónicas definidas en los ADRs.

```mermaid
graph TB
    subgraph "API REST Container (Node.js + Express + TypeScript)"
        subgraph "Controllers Layer"
            AuthController[Auth Controller<br/><br/>JWT Token Validation<br/>OAuth2 Integration]
            AppointmentController[Appointment Controller<br/><br/>REST Endpoints<br/>Transaction Management]
            UserController[User Controller<br/><br/>Profile Management<br/>Role-based Access]
        end
        
        subgraph "Business Logic Layer"
            AppointmentService[Appointment Service<br/><br/>Availability Check<br/>Temporary Blocking<br/>Confirmation Logic]
            UserService[User Service<br/><br/>Profile Management<br/>Authorization Logic]
            NotificationService[Notification Service<br/><br/>Event Publishing<br/>Webhook Integration]
        end
        
        subgraph "Data Access Layer"
            AppointmentRepo[Appointment Repository<br/><br/>Prisma ORM<br/>SQL Transactions<br/>ACID Compliance]
            UserRepo[User Repository<br/><br/>Prisma ORM<br/>User Data Access]
        end
        
        subgraph "Integration Layer"
            EventPublisher[Event Publisher<br/><br/>RabbitMQ Producer<br/>Message Serialization]
            JWTValidator[JWT Validator<br/><br/>JWKS Endpoint<br/>Token Verification]
        end
    end
    
    subgraph "External Dependencies"
        Database[(PostgreSQL<br/><br/>ACID Transactions<br/>Prisma Migrations)]
        RabbitMQ[RabbitMQ<br/><br/>Message Broker<br/>Retry Queues]
        AuthProvider[OAuth2 Provider<br/><br/>JWKS Endpoint<br/>Token Issuance]
    end
    
    AuthController --> JWTValidator
    AuthController --> UserService
    
    AppointmentController --> AppointmentService
    AppointmentController --> AuthController
    
    UserController --> UserService
    UserController --> AuthController
    
    AppointmentService --> AppointmentRepo
    AppointmentService --> EventPublisher
    AppointmentService --> NotificationService
    
    UserService --> UserRepo
    UserService --> AuthProvider
    
    NotificationService --> EventPublisher
    
    AppointmentRepo --> Database
    UserRepo --> Database
    EventPublisher --> RabbitMQ
    JWTValidator --> AuthProvider
```

## Flujo de Transacción: Reserva de Turnos

Este diagrama muestra el flujo específico de la transacción clave del sistema - la reserva de turnos - implementando las decisiones arquitectónicas de transacciones ACID, eventos asincrónicos y webhooks.

```mermaid
sequenceDiagram
    participant C as Cliente HTTP<br/>(Postman/Request)
    participant API as API REST
    participant DB as PostgreSQL<br/>(Prisma ORM)
    participant RMQ as RabbitMQ
    participant W as Worker
    participant EXT as Sistema Externo
    
    Note over C,EXT: Flujo de Reserva de Turnos con Transacciones ACID
    
    C->>API: POST /appointments<br/>Authorization: Bearer JWT
    API->>API: Validar JWT Token (Keycloak JWKS)
    
    Note over API,DB: Transacción ACID - Verificación y Bloqueo
    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT disponibilidad (Prisma)
    API->>DB: UPDATE bloqueo_temporal (Prisma)
    API->>DB: INSERT appointment PENDING (Prisma)
    API->>DB: COMMIT TRANSACTION
    
    API->>RMQ: Publish "appointment.created" event
    API->>C: 201 Created<br/>{"appointment_id": "123"}
    
    Note over RMQ,W: Procesamiento Asincrónico
    RMQ->>W: Consume "appointment.created"
    W->>DB: SELECT appointment details (Prisma)
    W->>EXT: HTTP POST webhook<br/>{"event": "appointment.created"}
    
    alt Webhook Exitoso
        EXT->>W: 200 OK
        W->>DB: UPDATE status = CONFIRMED (Prisma)
        W->>RMQ: Publish "appointment.confirmed"
    else Webhook Fallido
        EXT->>W: 500 Error / Timeout
        W->>RMQ: Publish "appointment.retry" (DLQ)
        Note over W: Reintento automático con RabbitMQ
    end
    
    Note over C: Cliente puede consultar estado<br/>GET /appointments/{id}
```

## Arquitectura de Despliegue

Este diagrama muestra cómo se despliega el sistema usando Docker y Docker Compose, reflejando las decisiones de contenedores y observabilidad.

```mermaid
graph TB
    subgraph "Docker Environment"
        subgraph "Backend Containers"
            APIContainer[API Container<br/><br/>Node.js + Express<br/>TypeScript + Prisma<br/>REST Endpoints]
            WorkerContainer[Worker Container<br/><br/>Node.js<br/>RabbitMQ Consumer<br/>Webhook Processing]
        end
        
        subgraph "Data Containers"
            PostgresContainer[(PostgreSQL Container<br/><br/>ACID Transactions<br/>Prisma Migrations<br/>Persistent Volume)]
            RabbitMQContainer[RabbitMQ Container<br/><br/>Message Broker<br/>Management UI<br/>Retry Queues]
        end
        
        subgraph "External Services"
            KeycloakContainer[Keycloak Container<br/><br/>OAuth2 Provider<br/>JWT Issuance<br/>JWKS Endpoint]
        end
        
        subgraph "Observability Stack"
            KibanaContainer[Kibana Container<br/><br/>Log Analysis<br/>Dashboard Visualization<br/>Structured Logs]
            ElasticsearchContainer[Elasticsearch Container<br/><br/>Log Storage<br/>Search Engine<br/>JSON Documents]
        end
    end
    
    subgraph "Development Tools"
        Postman[Postman Collection<br/><br/>API Testing<br/>Endpoint Documentation<br/>Request Examples]
        DockerCompose[Docker Compose<br/><br/>Multi-container<br/>Development Environment<br/>Service Orchestration]
    end
    
    subgraph "API Clients"
        HTTPClients[HTTP Clients<br/><br/>Postman<br/>curl<br/>Custom Applications]
    end
    
    HTTPClients --> APIContainer
    APIContainer --> PostgresContainer
    APIContainer --> RabbitMQContainer
    APIContainer --> KeycloakContainer
    APIContainer --> ElasticsearchContainer
    
    WorkerContainer --> RabbitMQContainer
    WorkerContainer --> PostgresContainer
    WorkerContainer --> ElasticsearchContainer
    
    ElasticsearchContainer --> KibanaContainer
    
    Postman --> APIContainer
    DockerCompose --> APIContainer
    DockerCompose --> WorkerContainer
    DockerCompose --> PostgresContainer
    DockerCompose --> RabbitMQContainer
    DockerCompose --> KeycloakContainer
    DockerCompose --> ElasticsearchContainer
    DockerCompose --> KibanaContainer
```

🧩 ADRs – Architectural Decision Records
🧾 ADR 1: Estilo de comunicación – REST API

Decisión: Se elige REST sobre gRPC.
Motivo:

Simplicidad para clientes web y móviles.

Soporte nativo en herramientas de prueba (Postman).

Menor curva de aprendizaje.
Consecuencia:

Las integraciones asincrónicas (recordatorios) usarán eventos y no RPCs.

🧾 ADR 2: Base de datos – PostgreSQL + Prisma ORM

Decisión: Se usa PostgreSQL como base de datos principal con Prisma ORM.
Motivo:

Soporte para transacciones ACID (necesario en reservas).

Prisma ORM: Generación automática de tipos TypeScript, migraciones automáticas, cliente type-safe.

Facilidad para manejar seeds y migraciones con Prisma CLI.

Consecuencia:

Datos estructurados y consistentes; Prisma maneja la normalización automáticamente.

Desarrollo más rápido con tipos automáticos y validaciones.

🧾 ADR 3: Asincronía – RabbitMQ

Decisión: Se elige RabbitMQ como broker de mensajería.
Motivo:

Modelo productor–consumidor simple.

Soporte nativo para reintentos y colas diferidas.

Amplio soporte en Node.js.
Consecuencia:

El microservicio de recordatorios consumirá mensajes desde RabbitMQ.

🧾 ADR 4: Seguridad – Keycloak + OAuth2 + JWT

Decisión: Autenticación mediante Keycloak como proveedor OAuth2 con tokens JWT.
Motivo:

Keycloak: Solución completa de gestión de identidad y acceso (IAM).

Integración estándar OAuth2 con JWKS endpoint para validación de tokens.

Tokens JWT firmados que permiten validación sin consultas adicionales a la BD.

Consecuencia:

Los endpoints protegidos requerirán validación de tokens JWT contra JWKS de Keycloak.

Desarrollo simplificado sin necesidad de implementar autenticación propia.

🧾 ADR 5: Integración – Webhook HTTP POST

Decisión: Implementar integración mediante Webhooks HTTP POST.
Motivo:

Comunicación simple con sistemas externos (notificaciones, confirmaciones).

Evita mantener conexiones persistentes como WebSocket.

Patrón estándar para integraciones asíncronas.
Consecuencia:

Los eventos de confirmación/cancelación se enviarán por HTTP POST.

El Worker procesará los webhooks con reintentos automáticos via RabbitMQ.

🧾 ADR 6: Observabilidad – Kibana + Elasticsearch

Decisión: Usar Kibana + Elasticsearch para logs estructurados.
Motivo:

Kibana: Herramienta conocida para análisis y visualización de logs.

Elasticsearch: Motor de búsqueda robusto para logs estructurados JSON.

Integración nativa entre Kibana y Elasticsearch.

Consecuencia:

Logs estructurados en formato JSON enviados a Elasticsearch.

Dashboards y análisis de logs mediante Kibana.

🧾 ADR 7: Scope del Proyecto – Solo Backend API

Decisión: Desarrollo únicamente de APIs REST, sin frontend.
Motivo:

Enfoque específico en la lógica de negocio y arquitectura backend.

Simplificación del desarrollo y testing.

Los clientes interactuarán mediante HTTP requests directos o Postman.
Consecuencia:

No se desarrollará interfaz de usuario.

Toda la interacción será mediante endpoints REST documentados.

Testing mediante colección de Postman.