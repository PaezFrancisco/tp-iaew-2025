import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Importar rutas
import patientRoutes from './routes/patient.routes';

// Importar middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

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
  console.log(`[PATIENTS-SERVICE] [${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// Rutas de la API
app.use('/api/v1/patients', patientRoutes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'patients-service',
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    service: 'Patients Service',
    version: '1.0.0',
    description: 'Microservicio de gestión de pacientes',
    endpoints: {
      patients: '/api/v1/patients',
      health: '/health'
    }
  });
});

// Middleware de manejo de errores
app.use(notFoundHandler);
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🏥 Patients Service ejecutándose en puerto ${PORT}`);
  console.log(`📚 API disponible en: http://localhost:${PORT}/api/v1/patients`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app;

