// ============================================
// RUTAS DE PACIENTES
// ============================================

import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const controller = new PatientController();

// GET /patients - Listar pacientes (requiere ADMIN)
router.get('/', authenticate, authorize('admin'), controller.getAll);

// GET /patients/:patientId - Obtener paciente por ID
router.get('/:patientId', authenticate, controller.getById);

// POST /patients - Crear paciente (público)
router.post('/', controller.create);

// PUT /patients/:patientId - Actualizar paciente
router.put('/:patientId', authenticate, controller.update);

// DELETE /patients/:patientId - Eliminar paciente (requiere ADMIN)
router.delete('/:patientId', authenticate, authorize('admin'), controller.delete);

// GET /patients/:patientId/appointments - Turnos de un paciente
router.get('/:patientId/appointments', authenticate, async (req, res) => {
  const { patientId } = req.params;
  const { AppointmentController } = await import('../controllers/appointment.controller');
  const appointmentController = new AppointmentController();
  req.query.patientId = patientId;
  appointmentController.getAll(req, res);
});

export default router;

