// ============================================
// RUTAS DE TURNOS
// ============================================

import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const controller = new AppointmentController();

// GET /appointments - Listar turnos (requiere ADMIN o PROFESSIONAL)
router.get('/', authenticate, authorize('admin', 'professional'), controller.getAll);

// GET /appointments/:appointmentId - Obtener turno por ID
router.get('/:appointmentId', authenticate, controller.getById);

// POST /appointments - Crear turno / Reservar turno
router.post('/', authenticate, controller.create);

// PATCH /appointments/:appointmentId - Actualizar estado de turno
router.patch('/:appointmentId', authenticate, controller.updateStatus);

// DELETE /appointments/:appointmentId - Cancelar turno
router.delete('/:appointmentId', authenticate, controller.cancel);

export default router;

