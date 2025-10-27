import { Router, Request, Response } from 'express';
import axios from 'axios';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// Proxy para todas las rutas de pacientes
router.all('*', asyncHandler(async (req: Request, res: Response) => {
  const services = (req as any).services;
  const targetUrl = `${services.PATIENTS}/api/v1/patients${req.path}`;
  
  console.log(`[BFF] Proxying ${req.method} ${req.path} to ${targetUrl}`);
  
  try {
    const response = await axios({
      method: req.method as any,
      url: targetUrl,
      data: req.body,
      params: req.query,
      headers: {
        ...req.headers,
        host: undefined // Remover el header host para evitar conflictos
      },
      timeout: 10000 // 10 segundos de timeout
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error(`[BFF] Error proxying to patients service:`, error.message);
    
    if (error.response) {
      // El servicio respondió con un error
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      // El servicio no está disponible
      res.status(503).json({
        success: false,
        message: 'Servicio de pacientes no disponible',
        error: 'Service unavailable',
        timestamp: new Date().toISOString()
      });
    } else {
      // Error interno del BFF
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
}));

export default router;

