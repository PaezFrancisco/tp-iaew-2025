import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { ProfessionalController } from '../controllers/professional.controller';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();
const professionalController = new ProfessionalController();

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

// Validaciones para crear profesional
const createProfessionalValidation = [
  body('email').isEmail().withMessage('Email válido requerido'),
  body('firstName').notEmpty().withMessage('Nombre es requerido'),
  body('lastName').notEmpty().withMessage('Apellido es requerido'),
  body('license').notEmpty().withMessage('Matrícula es requerida'),
  body('specialty').notEmpty().withMessage('Especialidad es requerida'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experiencia debe ser un número positivo'),
  body('consultationFee').isFloat({ min: 0 }).withMessage('Honorario de consulta debe ser un número positivo'),
  body('phone').optional().isMobilePhone('es-AR').withMessage('Teléfono válido requerido')
];

// Validaciones para actualizar profesional
const updateProfessionalValidation = [
  body('firstName').optional().notEmpty().withMessage('Nombre no puede estar vacío'),
  body('lastName').optional().notEmpty().withMessage('Apellido no puede estar vacío'),
  body('specialty').optional().notEmpty().withMessage('Especialidad no puede estar vacía'),
  body('experience').optional().isInt({ min: 0 }).withMessage('Experiencia debe ser un número positivo'),
  body('consultationFee').optional().isFloat({ min: 0 }).withMessage('Honorario de consulta debe ser un número positivo'),
  body('phone').optional().isMobilePhone('es-AR').withMessage('Teléfono válido requerido')
];

// Validaciones para parámetros
const idValidation = [
  param('id').isUUID().withMessage('ID debe ser un UUID válido')
];

const licenseValidation = [
  param('license').notEmpty().withMessage('Matrícula es requerida')
];

// Rutas de profesionales
router.post('/', createProfessionalValidation, validateRequest, asyncHandler(professionalController.create));
router.get('/', asyncHandler(professionalController.findAll));
router.get('/specialty/:specialty', asyncHandler(professionalController.findBySpecialty));
router.get('/:id', idValidation, validateRequest, asyncHandler(professionalController.findById));
router.get('/license/:license', licenseValidation, validateRequest, asyncHandler(professionalController.findByLicense));
router.put('/:id', idValidation, updateProfessionalValidation, validateRequest, asyncHandler(professionalController.update));
router.delete('/:id', idValidation, validateRequest, asyncHandler(professionalController.delete));

export default router;
