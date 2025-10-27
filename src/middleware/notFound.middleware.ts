import { Request, Response, NextFunction } from 'express';

/**
 * Middleware para manejar rutas no encontradas (404)
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    error: error.message,
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};
