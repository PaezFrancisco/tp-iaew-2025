// ============================================
// API REST - Sistema de Reserva de Turnos Médicos
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// ROUTES - Placeholder
// ============================================

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Health Appointments API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Placeholder - Pacientes
app.get('/patients', (req, res) => {
  res.json({
    message: 'Endpoint de pacientes - En desarrollo',
    endpoint: 'GET /patients',
  });
});

// Placeholder - Profesionales
app.get('/professionals', (req, res) => {
  res.json({
    message: 'Endpoint de profesionales - En desarrollo',
    endpoint: 'GET /professionals',
  });
});

// Placeholder - Turnos
app.get('/appointments', (req, res) => {
  res.json({
    message: 'Endpoint de turnos - En desarrollo',
    endpoint: 'GET /appointments',
  });
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
  console.log(`📝 Health Check: http://localhost:${PORT}/health`);
  console.log(`📘 OpenAPI Spec: Consultar openapi.yaml`);
});

export default app;

