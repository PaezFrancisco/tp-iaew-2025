import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ScheduleController } from '../controllers/schedule.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const scheduleController = new ScheduleController();

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

// Validaciones para crear horario
const createScheduleValidation = [
  body('professionalId').isUUID().withMessage('ID de profesional debe ser un UUID válido'),
  body('dayOfWeek').isInt({ min: 0, max: 6 }).withMessage('Día de la semana debe ser entre 0 (domingo) y 6 (sábado)'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio debe estar en formato HH:MM'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin debe estar en formato HH:MM')
];

// Validaciones para actualizar horario
const updateScheduleValidation = [
  body('startTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de inicio debe estar en formato HH:MM'),
  body('endTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Hora de fin debe estar en formato HH:MM'),
  body('isActive').optional().isBoolean().withMessage('isActive debe ser un booleano')
];

// Validaciones para parámetros
const idValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido')
];

const professionalIdValidation = [
  param('professionalId').isUUID().withMessage('ID de profesional debe ser un UUID válido')
];

// Rutas de horarios
router.post('/', createScheduleValidation, validateRequest, asyncHandler(scheduleController.create));
router.get('/professional/:professionalId', professionalIdValidation, validateRequest, asyncHandler(scheduleController.findByProfessional));
router.get('/:id', idValidation, validateRequest, asyncHandler(scheduleController.findById));
router.put('/:id', idValidation, updateScheduleValidation, validateRequest, asyncHandler(scheduleController.update));
router.delete('/:id', idValidation, validateRequest, asyncHandler(scheduleController.delete));

export default router;
