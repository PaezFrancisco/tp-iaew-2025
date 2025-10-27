import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { AppointmentController } from '../controllers/appointment.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const appointmentController = new AppointmentController();

// Middleware de validación
const validateRequest = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      validationErrors: errors.array(),
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Validaciones para crear turno
const createAppointmentValidation = [
  body('patientId').isUUID().withMessage('ID de paciente debe ser un UUID válido'),
  body('professionalId').isUUID().withMessage('ID de profesional debe ser un UUID válido'),
  body('date').isISO8601().withMessage('Fecha debe estar en formato ISO 8601'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio debe estar en formato HH:MM'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin debe estar en formato HH:MM'),
  body('notes').optional().isString().withMessage('Notas debe ser texto')
];

// Validaciones para actualizar turno
const updateAppointmentValidation = [
  body('date').optional().isISO8601().withMessage('Fecha debe estar en formato ISO 8601'),
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio debe estar en formato HH:MM'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin debe estar en formato HH:MM'),
  body('status').optional().isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW']).withMessage('Estado inválido'),
  body('notes').optional().isString().withMessage('Notas debe ser texto')
];

// Validaciones para parámetros
const idValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido')
];

const professionalIdValidation = [
  param('professionalId').isUUID().withMessage('ID de profesional debe ser un UUID válido')
];

const patientIdValidation = [
  param('patientId').isUUID().withMessage('ID de paciente debe ser un UUID válido')
];

// Rutas de turnos
router.post('/', createAppointmentValidation, validateRequest, asyncHandler(appointmentController.create));
router.get('/', asyncHandler(appointmentController.findAll));
router.get('/patient/:patientId', patientIdValidation, validateRequest, asyncHandler(appointmentController.findByPatient));
router.get('/professional/:professionalId', professionalIdValidation, validateRequest, asyncHandler(appointmentController.findByProfessional));
router.get('/availability/:professionalId', professionalIdValidation, validateRequest, asyncHandler(appointmentController.getAvailability));
router.get('/:id', idValidation, validateRequest, asyncHandler(appointmentController.findById));
router.put('/:id', idValidation, updateAppointmentValidation, validateRequest, asyncHandler(appointmentController.update));
router.delete('/:id', idValidation, validateRequest, asyncHandler(appointmentController.delete));

export default router;
