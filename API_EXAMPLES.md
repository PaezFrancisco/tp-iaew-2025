# 📝 Ejemplos de Requests y Responses

Este documento contiene ejemplos prácticos de requests HTTP y sus respuestas para la API de Reserva de Turnos Médicos.

## 🔐 Autenticación

### POST /auth/login

**Request:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "patient1",
    "password": "password123"
  }'
```

**Response 200:**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikp1YW4gUMOpcmV6In0...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## 👥 Pacientes

### GET /patients

**Request:**
```bash
curl -X GET "http://localhost:3000/patients?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Juan Pérez",
      "email": "juan.perez@example.com",
      "phone": "+54 11 1234-5678",
      "dateOfBirth": "1985-03-20",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "name": "María García",
      "email": "maria.garcia@example.com",
      "phone": "+54 11 2345-6789",
      "dateOfBirth": "1990-05-15",
      "createdAt": "2024-01-16T10:00:00Z",
      "updatedAt": "2024-01-16T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "totalPages": 1
  }
}
```

### POST /patients

**Request:**
```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Carlos Rodríguez",
    "email": "carlos.rodriguez@example.com",
    "phone": "+54 11 3456-7890",
    "dateOfBirth": "1990-05-15"
  }'
```

**Response 201:**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "Carlos Rodríguez",
  "email": "carlos.rodriguez@example.com",
  "phone": "+54 11 3456-7890",
  "dateOfBirth": "1990-05-15",
  "createdAt": "2024-01-17T10:00:00Z",
  "updatedAt": "2024-01-17T10:00:00Z"
}
```

### GET /patients/{patientId}/appointments

**Request:**
```bash
curl -X GET "http://localhost:3000/patients/550e8400-e29b-41d4-a716-446655440000/appointments?status=CONFIRMED" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "professionalId": "880e8400-e29b-41d4-a716-446655440003",
      "patientId": "550e8400-e29b-41d4-a716-446655440000",
      "appointmentDate": "2024-02-15",
      "startTime": "10:00",
      "endTime": "10:30",
      "status": "CONFIRMED",
      "reason": "Consulta médica de rutina",
      "createdAt": "2024-01-18T10:00:00Z",
      "updatedAt": "2024-01-18T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## 👨‍⚕️ Profesionales

### GET /professionals

**Request:**
```bash
curl -X GET "http://localhost:3000/professionals?specialty=Cardiología" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "name": "Dr. Roberto Silva",
      "email": "roberto.silva@example.com",
      "phone": "+54 11 4567-8901",
      "specialty": "Medicina General",
      "licenseNumber": "MG-12345",
      "createdAt": "2024-01-14T10:00:00Z",
      "updatedAt": "2024-01-14T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### POST /professionals

**Request:**
```bash
curl -X POST http://localhost:3000/professionals \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dra. Ana Martínez",
    "email": "ana.martinez@example.com",
    "phone": "+54 11 4567-8901",
    "specialty": "Cardiología",
    "licenseNumber": "CARD-12345"
  }'
```

**Response 201:**
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440003",
  "name": "Dra. Ana Martínez",
  "email": "ana.martinez@example.com",
  "phone": "+54 11 4567-8901",
  "specialty": "Cardiología",
  "licenseNumber": "CARD-12345",
  "createdAt": "2024-01-14T10:00:00Z",
  "updatedAt": "2024-01-14T10:00:00Z"
}
```

---

## 📅 Disponibilidad

### GET /professionals/{professionalId}/availability

**Request:**
```bash
curl -X GET "http://localhost:3000/professionals/880e8400-e29b-41d4-a716-446655440003/availability?date=2024-02-15" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response 200:**
```json
{
  "professional": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "Dr. Roberto Silva",
    "specialty": "Medicina General"
  },
  "date": "2024-02-15",
  "availableSlots": [
    {
      "startTime": "09:00",
      "endTime": "09:30",
      "available": true
    },
    {
      "startTime": "09:30",
      "endTime": "10:00",
      "available": true
    },
    {
      "startTime": "10:00",
      "endTime": "10:30",
      "available": false
    },
    {
      "startTime": "11:00",
      "endTime": "11:30",
      "available": true
    }
  ]
}
```

---

## 🗓️ Turnos

### POST /appointments

**Request:**
```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "professionalId": "880e8400-e29b-41d4-a716-446655440003",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "appointmentDate": "2024-02-15",
    "startTime": "10:00",
    "endTime": "10:30",
    "reason": "Consulta médica de rutina"
  }'
```

**Response 201:**
```json
{
  "appointment": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "professionalId": "880e8400-e29b-41d4-a716-446655440003",
    "patientId": "550e8400-e29b-41d4-a716-446655440000",
    "appointmentDate": "2024-02-15",
    "startTime": "10:00",
    "endTime": "10:30",
    "status": "PENDING",
    "reason": "Consulta médica de rutina",
    "createdAt": "2024-01-18T10:00:00Z",
    "updatedAt": "2024-01-18T10:00:00Z"
  },
  "message": "Turno creado exitosamente. Estado: PENDING"
}
```

### GET /appointments/{appointmentId}

**Request:**
```bash
curl -X GET http://localhost:3000/appointments/990e8400-e29b-41d4-a716-446655440004 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response 200:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "professionalId": "880e8400-e29b-41d4-a716-446655440003",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "appointmentDate": "2024-02-15",
  "startTime": "10:00",
  "endTime": "10:30",
  "status": "CONFIRMED",
  "reason": "Consulta médica de rutina",
  "createdAt": "2024-01-18T10:00:00Z",
  "updatedAt": "2024-01-18T10:30:00Z",
  "professional": {
    "id": "880e8400-e29b-41d4-a716-446655440003",
    "name": "Dr. Roberto Silva",
    "email": "roberto.silva@example.com",
    "phone": "+54 11 4567-8901",
    "specialty": "Medicina General",
    "licenseNumber": "MG-12345"
  },
  "patient": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Juan Pérez",
    "email": "juan.perez@example.com",
    "phone": "+54 11 1234-5678"
  }
}
```

### PATCH /appointments/{appointmentId}

**Request:**
```bash
curl -X PATCH http://localhost:3000/appointments/990e8400-e29b-41d4-a716-446655440004 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```

**Response 200:**
```json
{
  "id": "990e8400-e29b-41d4-a716-446655440004",
  "professionalId": "880e8400-e29b-41d4-a716-446655440003",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "appointmentDate": "2024-02-15",
  "startTime": "10:00",
  "endTime": "10:30",
  "status": "CONFIRMED",
  "reason": "Consulta médica de rutina",
  "createdAt": "2024-01-18T10:00:00Z",
  "updatedAt": "2024-01-18T11:00:00Z"
}
```

### DELETE /appointments/{appointmentId}

**Request:**
```bash
curl -X DELETE http://localhost:3000/appointments/990e8400-e29b-41d4-a716-446655440004 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response 200:**
```json
{
  "message": "Turno cancelado exitosamente",
  "appointment": {
    "id": "990e8400-e29b-41d4-a716-446655440004",
    "status": "CANCELLED",
    "appointmentDate": "2024-02-15",
    "startTime": "10:00",
    "endTime": "10:30"
  }
}
```

---

## ❌ Respuestas de Error

### 400 Bad Request
```json
{
  "message": "Invalid request data",
  "code": "BAD_REQUEST",
  "details": {
    "field": "appointmentDate",
    "reason": "Date must be in the future"
  }
}
```

### 401 Unauthorized
```json
{
  "message": "Unauthorized - Invalid or missing token",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden
```json
{
  "message": "Forbidden - Insufficient permissions",
  "code": "FORBIDDEN"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found",
  "code": "NOT_FOUND",
  "details": {
    "resource": "Appointment",
    "id": "990e8400-e29b-41d4-a716-446655440004"
  }
}
```

### 409 Conflict
```json
{
  "message": "Appointment already exists for this time slot",
  "code": "CONFLICT",
  "details": {
    "professionalId": "880e8400-e29b-41d4-a716-446655440003",
    "date": "2024-02-15",
    "startTime": "10:00"
  }
}
```

### 500 Internal Server Error
```json
{
  "message": "Internal server error",
  "code": "INTERNAL_SERVER_ERROR"
}
```

---

## 🔗 Recursos Adicionales

- **OpenAPI Spec:** Ver archivo `openapi.yaml`
- **Postman Collection:** Importar `postman-collection.json`
- **Documentación Completa:** Ver `README.md`

