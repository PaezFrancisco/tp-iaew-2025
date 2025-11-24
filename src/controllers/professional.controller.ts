// ============================================
// CONTROLADOR DE PROFESIONALES
// ============================================

import { Request, Response } from 'express';
import { ProfessionalService } from '../services/professional.service';
import logger from '../config/logger';

export class ProfessionalController {
  private service: ProfessionalService;

  constructor() {
    this.service = new ProfessionalService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const specialty = req.query.specialty as string;
      const email = req.query.email as string;

      const result = await this.service.getAll({ page, limit, specialty, email });
      res.json(result);
    } catch (error: any) {
      logger.error('Error obteniendo profesionales', { error: error.message });
      res.status(500).json({
        message: 'Error obteniendo profesionales',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { professionalId } = req.params;
      const professional = await this.service.getById(professionalId);
      res.json(professional);
    } catch (error: any) {
      if (error.message === 'Profesional no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error obteniendo profesional', { error: error.message });
      res.status(500).json({
        message: 'Error obteniendo profesional',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, email, phone, specialty, licenseNumber } = req.body;

      if (!name || !email || !phone || !specialty || !licenseNumber) {
        return res.status(400).json({
          message: 'Campos requeridos: name, email, phone, specialty, licenseNumber',
          code: 'BAD_REQUEST',
        });
      }

      const professional = await this.service.create({
        name,
        email,
        phone,
        specialty,
        licenseNumber,
      });

      res.status(201).json(professional);
    } catch (error: any) {
      if (error.message.includes('Ya existe')) {
        return res.status(409).json({
          message: error.message,
          code: 'CONFLICT',
        });
      }
      logger.error('Error creando profesional', { error: error.message });
      res.status(500).json({
        message: 'Error creando profesional',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { professionalId } = req.params;
      const { name, email, phone, specialty, licenseNumber } = req.body;

      const professional = await this.service.update(professionalId, {
        name,
        email,
        phone,
        specialty,
        licenseNumber,
      });

      res.json(professional);
    } catch (error: any) {
      if (error.message === 'Profesional no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      if (error.message.includes('Ya existe')) {
        return res.status(409).json({
          message: error.message,
          code: 'CONFLICT',
        });
      }
      logger.error('Error actualizando profesional', { error: error.message });
      res.status(500).json({
        message: 'Error actualizando profesional',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };
}

