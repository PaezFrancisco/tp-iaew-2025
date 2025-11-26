// ============================================
// API REST - Sistema de Reserva de Turnos Médicos
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { connectRabbitMQ } from './config/rabbitmq';
import logger from './config/logger';

const apiLogger = logger.child({ component: 'api' });

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  const start = Date.now();

  const segments = req.path.split('/').filter(Boolean);
  const resource = segments[1] || 'unknown'; // ej: /api/appointments -> 'appointments'

  const merged = { ...req.params, ...req.query, ...req.body } as any;
  const patientId = merged.patientId;
  const professionalId = merged.professionalId;
  const appointmentId = merged.appointmentId;
  const domainStatus = merged.status;

  const userId = (req as any).user?.sub;
  const userEmail = (req as any).user?.email;

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    apiLogger.info('HTTP Request Completed', {
      origin: 'api',
      resource,
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      durationMs,
      ip: req.ip,
      patientId,
      professionalId,
      appointmentId,
      status: domainStatus,
      userId,
      userEmail,
    });
  });

  next();
});

// ============================================
// ROUTES
// ============================================
app.use('/api', routes);

// ============================================
// ERROR HANDLING
// ============================================
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  apiLogger.error('Error no manejado', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
  
  res.status(500).json({
    message: 'Error interno del servidor',
    code: 'INTERNAL_SERVER_ERROR',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// ============================================
// SERVER INITIALIZATION
// ============================================
async function startServer() {
  try {
    // Conectar a RabbitMQ (con reintentos)
    let rabbitmqConnected = false;
    const maxRetries = 5;
    for (let i = 0; i < maxRetries; i++) {
      try {
        await connectRabbitMQ();
        apiLogger.info('Conectado a RabbitMQ');
        rabbitmqConnected = true;
        break;
      } catch (error: any) {
        logger.warn(`Intento ${i + 1}/${maxRetries} de conexión a RabbitMQ falló`, { 
          error: error.message 
        });
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!rabbitmqConnected) {
      apiLogger.warn('No se pudo conectar a RabbitMQ después de varios intentos, continuando sin él');
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      apiLogger.info('Servidor API iniciado', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
      });
      console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
      console.log(`📝 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📘 OpenAPI Spec: Consultar openapi.yaml`);
    });

    // Manejar errores del servidor sin detenerlo
    server.on('error', (error: any) => {
      apiLogger.error('Error en el servidor HTTP', { 
        error: error.message,
        code: error.code,
        port: PORT 
      });
    });

    // Manejar cierre graceful
    process.on('SIGTERM', () => {
      apiLogger.info('Recibida señal SIGTERM, cerrando servidor gracefully...');
      server.close(() => {
        apiLogger.info('Servidor cerrado');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      apiLogger.info('Recibida señal SIGINT, cerrando servidor gracefully...');
      server.close(() => {
        apiLogger.info('Servidor cerrado');
        process.exit(0);
      });
    });

    // Manejar errores no capturados sin detener el servidor
    process.on('uncaughtException', (error: Error) => {
      apiLogger.error('Error no capturado', { 
        error: error.message,
        stack: error.stack 
      });
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      apiLogger.error('Promise rechazada no manejada', { 
        reason: reason?.message || reason,
        stack: reason?.stack 
      });
    });

  } catch (error: any) {
    apiLogger.error('Error crítico iniciando servidor', { 
      error: error.message,
      stack: error.stack 
    });
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      apiLogger.warn('Modo desarrollo: continuando a pesar del error');
    }
  }
}

startServer();

export default app;

