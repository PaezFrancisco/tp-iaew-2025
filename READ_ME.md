# 🏥 Sistema de Reserva de Turnos de Salud Ambulatoria

## 📘 Proyecto y Dominio

El proyecto consiste en el desarrollo de una **API REST** para la **gestión de reservas de turnos médicos ambulatorios**, permitiendo a los pacientes consultar la disponibilidad de profesionales, reservar turnos y recibir recordatorios automáticos.

El sistema contempla:
- **Entidades principales:** Paciente, Profesional (con agenda)
- **Transacción clave:** Reserva de turno (verificación de disponibilidad, bloqueo temporal y confirmación)
- **Asincronía:** Recordatorios automáticos con reintentos
- **Integración:** Webhook de confirmación/cancelación o tablero en vivo vía WebSocket
- **Seguridad:** OAuth2 + JWT
- **Contenedores:** Docker + Docker Compose
- **Observabilidad:** logs estructurados y métricas básicas
- **Pruebas:** colección de Postman
## Nivel 1: Contexto del Sistema

Este diagrama muestra el sistema de reserva de turnos médicos en su contexto más amplio, identificando los usuarios principales y los sistemas externos con los que interactúa.

```mermaid
graph TB
    subgraph "Usuarios"
        Patient[Paciente<br/>Reserva turnos médicos]
        Professional[Profesional Médico<br/>Gestiona agenda y turnos]
    end
    
    subgraph "Sistema Principal"
        System[Sistema de Reserva<br/>de Turnos Médicos<br/><br/>Permite a pacientes reservar<br/>turnos y a profesionales<br/>gestionar sus agendas]
    end
    
    subgraph "Sistemas Externos"
        AuthProvider[Proveedor OAuth2<br/><br/>Keycloak / Auth0<br/>Autenticación y autorización]
        CalendarSystem[Sistema de Calendario<br/><br/>Integración externa<br/>Sincronización de eventos]
    end
    
    Patient -->|"Reserva turnos<br/>Consulta disponibilidad<br/>Cancela citas"| System
    Professional -->|"Gestiona agenda<br/>Configura horarios<br/>Ve citas programadas"| System
    
    System -->|"Valida credenciales<br/>Obtiene permisos"| AuthProvider
    System -->|"Envía notificaciones<br/>Sincroniza eventos"| CalendarSystem
```

## Nivel 2: Contenedores del Sistema

Este diagrama descompone el sistema en sus principales contenedores, mostrando las responsabilidades de cada uno y cómo se comunican entre sí según las decisiones arquitectónicas tomadas.

```mermaid
graph TB
    subgraph "Usuarios"
        Patient[Paciente<br/>Reserva turnos médicos]
        Professional[Profesional Médico<br/>Gestiona agenda]
    end
    
    subgraph "Sistema de Reserva de Turnos"
        WebApp[Aplicación Web/Móvil<br/><br/>Frontend SPA<br/>Interfaz de usuario]
        API[API REST<br/><br/>Node.js + Express + TypeScript<br/>Endpoints REST + WebSocket<br/>Validación JWT]
        Worker[Worker de Recordatorios<br/><br/>Node.js<br/>Consumidor RabbitMQ<br/>Reintentos automáticos]
    end
    
    subgraph "Almacenamiento y Comunicación"
        Database[(PostgreSQL<br/><br/>Transacciones ACID<br/>ORM Prisma/Sequelize<br/>Migraciones)]
        MessageBroker[RabbitMQ<br/><br/>Colas de mensajes<br/>Reintentos y colas diferidas<br/>Patrón Producer-Consumer]
    end
    
    subgraph "Servicios Externos"
        AuthProvider[OAuth2 Provider<br/><br/>Keycloak / Auth0<br/>Validación JWT<br/>JWKS Endpoint]
        ExternalSystem[Sistema Externo<br/><br/>Webhook HTTP POST<br/>Confirmaciones/Cancelaciones]
        Monitoring[Monitoreo<br/><br/>Prometheus + Grafana<br/>Logs estructurados]
    end
    
    Patient -->|"HTTPS<br/>REST API"| WebApp
    Professional -->|"HTTPS<br/>REST API"| WebApp
    
    WebApp -->|"HTTPS<br/>REST API<br/>WebSocket"| API
    
    API -->|"SQL Transaccional<br/>Prisma ORM"| Database
    API -->|"AMQP<br/>Publish Events"| MessageBroker
    API -->|"HTTPS<br/>JWT Validation"| AuthProvider
    API -->|"HTTP<br/>Structured Logs"| Monitoring
    
    Worker -->|"AMQP<br/>Consume Messages"| MessageBroker
    Worker -->|"SQL<br/>Read Appointments"| Database
    Worker -->|"HTTP POST<br/>Webhook"| ExternalSystem
    Worker -->|"HTTP<br/>Metrics"| Monitoring
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
    participant P as Paciente
    participant API as API REST
    participant DB as PostgreSQL
    participant RMQ as RabbitMQ
    participant W as Worker
    participant EXT as Sistema Externo
    
    Note over P,EXT: Flujo de Reserva de Turnos con Transacciones ACID
    
    P->>API: POST /appointments (JWT Token)
    API->>API: Validar JWT Token (JWKS)
    
    Note over API,DB: Transacción ACID - Verificación y Bloqueo
    API->>DB: BEGIN TRANSACTION
    API->>DB: SELECT disponibilidad
    API->>DB: UPDATE bloqueo_temporal
    API->>DB: INSERT appointment (PENDING)
    API->>DB: COMMIT TRANSACTION
    
    API->>RMQ: Publish "appointment.created" event
    API->>P: 201 Created (appointment_id)
    
    Note over RMQ,W: Procesamiento Asincrónico
    RMQ->>W: Consume "appointment.created"
    W->>DB: SELECT appointment details
    W->>EXT: HTTP POST webhook (confirmación)
    
    alt Webhook Exitoso
        EXT->>W: 200 OK
        W->>DB: UPDATE status = CONFIRMED
        W->>RMQ: Publish "appointment.confirmed"
    else Webhook Fallido
        EXT->>W: 500 Error / Timeout
        W->>RMQ: Publish "appointment.retry" (DLQ)
        Note over W: Reintento automático con RabbitMQ
    end
    
    Note over API,P: Notificación en Tiempo Real
    API->>P: WebSocket: appointment.status_changed
```

## Arquitectura de Despliegue

Este diagrama muestra cómo se despliega el sistema usando Docker y Docker Compose, reflejando las decisiones de contenedores y observabilidad.

```mermaid
graph TB
    subgraph "Docker Environment"
        subgraph "Frontend Container"
            WebApp[Web App Container<br/><br/>Nginx + SPA<br/>Static Files]
        end
        
        subgraph "Backend Containers"
            APIContainer[API Container<br/><br/>Node.js + Express<br/>TypeScript + Prisma]
            WorkerContainer[Worker Container<br/><br/>Node.js<br/>RabbitMQ Consumer]
        end
        
        subgraph "Data Containers"
            PostgresContainer[(PostgreSQL Container<br/><br/>ACID Transactions<br/>Persistent Volume)]
            RabbitMQContainer[RabbitMQ Container<br/><br/>Message Broker<br/>Management UI]
        end
        
        subgraph "External Services"
            AuthContainer[Auth Provider<br/><br/>Keycloak/Auth0<br/>OAuth2 + JWT]
        end
        
        subgraph "Observability Stack"
            PrometheusContainer[Prometheus Container<br/><br/>Metrics Collection<br/>Time Series DB]
            GrafanaContainer[Grafana Container<br/><br/>Dashboards<br/>Visualization]
            LogContainer[Log Aggregation<br/><br/>Structured Logs<br/>JSON Format]
        end
    end
    
    subgraph "Development Tools"
        Postman[Postman Collection<br/><br/>API Testing<br/>Endpoint Documentation]
        DockerCompose[Docker Compose<br/><br/>Multi-container<br/>Development Environment]
    end
    
    WebApp --> APIContainer
    APIContainer --> PostgresContainer
    APIContainer --> RabbitMQContainer
    APIContainer --> AuthContainer
    APIContainer --> PrometheusContainer
    
    WorkerContainer --> RabbitMQContainer
    WorkerContainer --> PostgresContainer
    WorkerContainer --> PrometheusContainer
    
    PrometheusContainer --> GrafanaContainer
    APIContainer --> LogContainer
    WorkerContainer --> LogContainer
    
    Postman --> APIContainer
    DockerCompose --> APIContainer
    DockerCompose --> WorkerContainer
    DockerCompose --> PostgresContainer
    DockerCompose --> RabbitMQContainer
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

🧾 ADR 2: Base de datos – PostgreSQL (SQL)

Decisión: Se usa PostgreSQL como base de datos principal.
Motivo:

Soporte para transacciones (necesario en reservas).

Amplio soporte ORM (Prisma, Sequelize).

Facilidad para manejar seeds y migraciones.
Consecuencia:

Datos estructurados y consistentes; se requerirá normalización adecuada.

🧾 ADR 3: Asincronía – RabbitMQ

Decisión: Se elige RabbitMQ como broker de mensajería.
Motivo:

Modelo productor–consumidor simple.

Soporte nativo para reintentos y colas diferidas.

Amplio soporte en Node.js.
Consecuencia:

El microservicio de recordatorios consumirá mensajes desde RabbitMQ.

🧾 ADR 4: Seguridad – OAuth2 + JWT

Decisión: Autenticación mediante OAuth2 con tokens JWT.
Motivo:

Integración estándar con terceros (Google, Auth0, Keycloak).

Tokens firmados que permiten validación sin consultas adicionales.
Consecuencia:

Los endpoints protegidos requerirán validación de tokens JWT.

🧾 ADR 5: Integración – Webhook

Decisión: Implementar integración mediante Webhooks.
Motivo:

Comunicación simple con sistemas externos (notificaciones, confirmaciones).

Evita mantener conexiones persistentes como WebSocket.
Consecuencia:

Los eventos de confirmación/cancelación se enviarán por HTTP POST.