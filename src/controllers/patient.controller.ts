// ============================================
// CONTROLADOR DE PACIENTES
// ============================================

import { Request, Response } from 'express';
import { PatientService } from '../services/patient.service';
import logger from '../config/logger';

export class PatientController {
  private service: PatientService;

  constructor() {
    this.service = new PatientService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const email = req.query.email as string;

      const result = await this.service.getAll({ page, limit, email });
      res.json(result);
    } catch (error: any) {
      logger.error('Error obteniendo pacientes', { error: error.message });
      res.status(500).json({
        message: 'Error obteniendo pacientes',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const patient = await this.service.getById(patientId);
      res.json(patient);
    } catch (error: any) {
      if (error.message === 'Paciente no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error obteniendo paciente', { error: error.message });
      res.status(500).json({
        message: 'Error obteniendo paciente',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, email, phone, dateOfBirth } = req.body;

      if (!name || !email || !phone) {
        return res.status(400).json({
          message: 'Campos requeridos: name, email, phone',
          code: 'BAD_REQUEST',
        });
      }

      const patient = await this.service.create({
        name,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      });

      res.status(201).json(patient);
    } catch (error: any) {
      if (error.message.includes('Ya existe')) {
        return res.status(409).json({
          message: error.message,
          code: 'CONFLICT',
        });
      }
      logger.error('Error creando paciente', { error: error.message });
      res.status(500).json({
        message: 'Error creando paciente',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      const { name, email, phone, dateOfBirth } = req.body;

      const patient = await this.service.update(patientId, {
        name,
        email,
        phone,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      });

      res.json(patient);
    } catch (error: any) {
      if (error.message === 'Paciente no encontrado') {
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
      logger.error('Error actualizando paciente', { error: error.message });
      res.status(500).json({
        message: 'Error actualizando paciente',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { patientId } = req.params;
      await this.service.delete(patientId);
      res.json({ message: 'Paciente eliminado exitosamente' });
    } catch (error: any) {
      if (error.message === 'Paciente no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error eliminando paciente', { error: error.message });
      res.status(500).json({
        message: 'Error eliminando paciente',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };
}

