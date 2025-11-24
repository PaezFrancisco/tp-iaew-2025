// ============================================
// RUTAS DE PROFESIONALES
// ============================================

import { Router } from 'express';
import { ProfessionalController } from '../controllers/professional.controller';
import { ScheduleController } from '../controllers/schedule.controller';
import { AppointmentController } from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const professionalController = new ProfessionalController();
const scheduleController = new ScheduleController();
const appointmentController = new AppointmentController();

// GET /professionals - Listar profesionales
router.get('/', authenticate, professionalController.getAll);

// GET /professionals/:professionalId - Obtener profesional por ID
router.get('/:professionalId', authenticate, professionalController.getById);

// POST /professionals - Crear profesional (requiere ADMIN)
router.post('/', authenticate, authorize('admin'), professionalController.create);

// PUT /professionals/:professionalId - Actualizar profesional
router.put('/:professionalId', authenticate, professionalController.update);

// GET /professionals/:professionalId/schedule - Obtener horarios
router.get('/:professionalId/schedule', authenticate, scheduleController.getSchedule);

// PUT /professionals/:professionalId/schedule - Actualizar horarios (requiere PROFESSIONAL)
router.put('/:professionalId/schedule', authenticate, authorize('professional', 'admin'), scheduleController.updateSchedule);

// GET /professionals/:professionalId/availability - Consultar disponibilidad
router.get('/:professionalId/availability', authenticate, appointmentController.getAvailability);

export default router;

