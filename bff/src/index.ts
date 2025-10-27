import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import axios from 'axios';

// Importar rutas del BFF
import patientsRoutes from './routes/patients.routes';
import professionalsRoutes from './routes/professionals.routes';
import appointmentsRoutes from './routes/appointments.routes';

// Importar middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de servicios
const SERVICES = {
  PATIENTS: process.env.PATIENTS_SERVICE_URL || 'http://localhost:3001',
  PROFESSIONALS: process.env.PROFESSIONALS_SERVICE_URL || 'http://localhost:3002',
  APPOINTMENTS: process.env.APPOINTMENTS_SERVICE_URL || 'http://localhost:3003'
};

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP por ventana
  message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.'
});
app.use(limiter);

// Middleware para parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de logging básico
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[BFF] [${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Middleware para agregar servicios a las requests
app.use((req, res, next) => {
  (req as any).services = SERVICES;
  next();
});

// Rutas del BFF
app.use('/api/v1/patients', patientsRoutes);
app.use('/api/v1/professionals', professionalsRoutes);
app.use('/api/v1/appointments', appointmentsRoutes);

// Ruta de health check
app.get('/health', async (req, res) => {
  const healthStatus = {
    service: 'bff-service',
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      patients: 'unknown',
      professionals: 'unknown',
      appointments: 'unknown'
    }
  };

  // Verificar estado de los microservicios
  try {
    const [patientsHealth, professionalsHealth, appointmentsHealth] = await Promise.allSettled([
      axios.get(`${SERVICES.PATIENTS}/health`),
      axios.get(`${SERVICES.PROFESSIONALS}/health`),
      axios.get(`${SERVICES.APPOINTMENTS}/health`)
    ]);

    healthStatus.services.patients = patientsHealth.status === 'fulfilled' ? 'OK' : 'ERROR';
    healthStatus.services.professionals = professionalsHealth.status === 'fulfilled' ? 'OK' : 'ERROR';
    healthStatus.services.appointments = appointmentsHealth.status === 'fulfilled' ? 'OK' : 'ERROR';
  } catch (error) {
    console.error('Error checking services health:', error);
  }

  res.status(200).json(healthStatus);
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'Backend for Frontend (BFF)',
    version: '1.0.0',
    description: 'Capa de agregación y orquestación para el sistema de reserva de turnos médicos',
    endpoints: {
      patients: '/api/v1/patients',
      professionals: '/api/v1/professionals',
      appointments: '/api/v1/appointments',
      health: '/health'
    },
    services: {
      patients: SERVICES.PATIENTS,
      professionals: SERVICES.PROFESSIONALS,
      appointments: SERVICES.APPOINTMENTS
    }
  });
});

// Middleware de manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 BFF Service ejecutándose en puerto ${PORT}`);
  console.log(`📚 API disponible en: http://localhost:${PORT}/api/v1`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Servicios configurados:`);
  console.log(`   👤 Pacientes: ${SERVICES.PATIENTS}`);
  console.log(`   👨‍⚕️ Profesionales: ${SERVICES.PROFESSIONALS}`);
  console.log(`   📅 Turnos: ${SERVICES.APPOINTMENTS}`);
});

export default app;

