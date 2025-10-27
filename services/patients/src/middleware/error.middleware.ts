import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ApiError, ValidationError } from '../types';

// Middleware para manejar rutas no encontradas
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error: ApiError = new Error(`Ruta no encontrada: ${req.originalUrl}`) as ApiError;
  error.statusCode = 404;
  error.isOperational = true;
  next(error);
};

// Middleware principal de manejo de errores
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Error interno del servidor';
  let validationErrors: ValidationError[] | undefined;

  // Log del error
  console.error(`[PATIENTS-SERVICE] [ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.error(`Status: ${statusCode}, Message: ${message}`);
  if (error.stack) {
    console.error(`Stack: ${error.stack}`);
  }

  // Manejo de errores específicos de Prisma
  if (error.name === 'PrismaClientKnownRequestError') {
    statusCode = 400;
    message = 'Error en la base de datos';
    
    // Error de violación de restricción única
    if ((error as any).code === 'P2002') {
      message = 'Ya existe un registro con estos datos';
    }
    
    // Error de registro no encontrado
    if ((error as any).code === 'P2025') {
      statusCode = 404;
      message = 'Registro no encontrado';
    }
  }

  // Manejo de errores de validación
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación';
    validationErrors = error.validationErrors;
  }

  // Manejo de errores de sintaxis JSON
  if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    message = 'JSON inválido en el cuerpo de la petición';
  }

  // Respuesta de error estructurada
  const response: ApiResponse = {
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    timestamp: new Date().toISOString()
  };

  // Agregar errores de validación si existen
  if (validationErrors) {
    (response as any).validationErrors = validationErrors;
  }

  res.status(statusCode).json(response);
};

// Middleware para manejar errores asincrónicos
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Función para crear errores personalizados
export const createError = (
  message: string,
  statusCode: number = 500,
  validationErrors?: ValidationError[]
): ApiError => {
  const error: ApiError = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.isOperational = true;
  if (validationErrors) {
    error.validationErrors = validationErrors;
  }
  return error;
};

