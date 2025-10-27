import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PatientController } from '../controllers/patient.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const patientController = new PatientController();

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

// Validaciones para crear paciente
const createPatientValidation = [
  body('email').isEmail().withMessage('Email válido requerido'),
  body('firstName').notEmpty().withMessage('Nombre es requerido'),
  body('lastName').notEmpty().withMessage('Apellido es requerido'),
  body('dni').isLength({ min: 7, max: 8 }).withMessage('DNI debe tener entre 7 y 8 caracteres'),
  body('birthDate').isISO8601().withMessage('Fecha de nacimiento válida requerida'),
  body('phone').optional().isMobilePhone('es-AR').withMessage('Teléfono válido requerido'),
  body('address').optional().isString().withMessage('Dirección debe ser texto'),
  body('medicalHistory').optional().isString().withMessage('Historial médico debe ser texto')
];

// Validaciones para actualizar paciente
const updatePatientValidation = [
  body('firstName').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('lastName').optional().notEmpty().withMessage('Apellido no puede estar vacío'),
  body('phone').optional().isMobilePhone('es-AR').withMessage('Teléfono válido requerido'),
  body('address').optional().isString().withMessage('Dirección debe ser texto'),
  body('medicalHistory').optional().isString().withMessage('Historial médico debe ser texto')
];

// Validaciones para parámetros
const idValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido')
];

const dniValidation = [
  param('dni').isLength({ min: 7, max: 8 }).withMessage('DNI debe tener entre 7 y 8 caracteres')
];

// Rutas de pacientes
router.post('/', createPatientValidation, validateRequest, asyncHandler(patientController.create));
router.get('/', asyncHandler(patientController.findAll));
router.get('/:id', idValidation, validateRequest, asyncHandler(patientController.findById));
router.get('/dni/:dni', dniValidation, validateRequest, asyncHandler(patientController.findByDni));
router.put('/:id', idValidation, updatePatientValidation, validateRequest, asyncHandler(patientController.update));
router.delete('/:id', idValidation, validateRequest, asyncHandler(patientController.delete));

export default router;
