// ============================================
// API REST - Sistema de Reserva de Turnos Médicos
// ============================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
import { connectRabbitMQ } from './config/rabbitmq';
import logger from './config/logger';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());

// Middleware de logging de requests
app.use((req, res, next) => {
  logger.info('HTTP Request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
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
  logger.error('Error no manejado', {
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
        logger.info('Conectado a RabbitMQ');
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
      logger.warn('No se pudo conectar a RabbitMQ después de varios intentos, continuando sin él');
    }

    // Iniciar servidor
    const server = app.listen(PORT, () => {
      logger.info('Servidor API iniciado', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
      });
      console.log(`🚀 Servidor API corriendo en http://localhost:${PORT}`);
      console.log(`📝 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`📘 OpenAPI Spec: Consultar openapi.yaml`);
    });

    // Manejar errores del servidor sin detenerlo
    server.on('error', (error: any) => {
      logger.error('Error en el servidor HTTP', { 
        error: error.message,
        code: error.code,
        port: PORT 
      });
      // No hacer process.exit, solo loguear el error
    });

    // Manejar cierre graceful
    process.on('SIGTERM', () => {
      logger.info('Recibida señal SIGTERM, cerrando servidor gracefully...');
      server.close(() => {
        logger.info('Servidor cerrado');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('Recibida señal SIGINT, cerrando servidor gracefully...');
      server.close(() => {
        logger.info('Servidor cerrado');
        process.exit(0);
      });
    });

    // Manejar errores no capturados sin detener el servidor
    process.on('uncaughtException', (error: Error) => {
      logger.error('Error no capturado', { 
        error: error.message,
        stack: error.stack 
      });
      // No hacer process.exit, solo loguear
    });

    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Promise rechazada no manejada', { 
        reason: reason?.message || reason,
        stack: reason?.stack 
      });
      // No hacer process.exit, solo loguear
    });

  } catch (error: any) {
    logger.error('Error crítico iniciando servidor', { 
      error: error.message,
      stack: error.stack 
    });
    // Solo hacer exit si es un error realmente crítico
    // En desarrollo, intentar continuar
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    } else {
      logger.warn('Modo desarrollo: continuando a pesar del error');
    }
  }
}

startServer();

export default app;

