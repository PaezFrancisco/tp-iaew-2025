// ============================================
// MIDDLEWARE DE AUTENTICACIÓN JWT
// ============================================

import { Request, Response, NextFunction } from 'express';
import { validateJWT, extractTokenFromHeader } from '../utils/jwt';
import logger from '../config/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub: string;
        email?: string;
        roles?: string[];
        [key: string]: any;
      };
    }
  }
}

// Middleware de autenticación
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        message: 'Token de autenticación requerido',
        code: 'UNAUTHORIZED',
      });
    }

    const payload = await validateJWT(token);

    req.user = {
      sub: payload.sub,
      email: payload.email,
      roles: payload.realm_access?.roles || [],
      ...payload,
    };

    logger.info('Usuario autenticado', { userId: payload.sub, email: payload.email });
    next();
  } catch (error: any) {
    logger.warn('Error de autenticación', { error: error.message });
    return res.status(401).json({
      message: 'Token inválido o expirado',
      code: 'UNAUTHORIZED',
    });
  }
}

// Middleware de autorización por roles
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'No autenticado',
        code: 'UNAUTHORIZED',
      });
    }

    const userRoles = req.user.roles || [];
    // Normalizar roles a minúsculas para comparación
    const normalizedUserRoles = userRoles.map((r: string) => r.toLowerCase());
    const normalizedAllowedRoles = allowedRoles.map((r: string) => r.toLowerCase());
    
    const hasRole = normalizedAllowedRoles.some(role => normalizedUserRoles.includes(role));

    if (!hasRole && allowedRoles.length > 0) {
      logger.warn('Acceso denegado por falta de permisos', {
        userId: req.user.sub,
        requiredRoles: allowedRoles,
        userRoles,
      });
      return res.status(403).json({
        message: 'No tiene permisos para esta operación',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

