// ============================================
// RUTAS PRINCIPALES
// ============================================

import { Router } from 'express';
import patientsRoutes from './patients.routes';
import professionalsRoutes from './professionals.routes';
import appointmentsRoutes from './appointments.routes';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Health Appointments API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Rutas de la API
router.use('/patients', patientsRoutes);
router.use('/professionals', professionalsRoutes);
router.use('/appointments', appointmentsRoutes);

export default router;

