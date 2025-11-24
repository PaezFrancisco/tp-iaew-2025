// ============================================
// CONTROLADOR DE TURNOS
// ============================================

import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { AppointmentStatus } from '@prisma/client';
import logger from '../config/logger';

export class AppointmentController {
  private service: AppointmentService;

  constructor() {
    this.service = new AppointmentService();
  }

  getAll = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as AppointmentStatus | undefined;
      const professionalId = req.query.professionalId as string | undefined;
      const patientId = req.query.patientId as string | undefined;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await this.service.getAll({
        page,
        limit,
        status,
        professionalId,
        patientId,
        startDate,
        endDate,
      });
      res.json(result);
    } catch (error: any) {
      logger.error('Error obteniendo turnos', { error: error.message });
      res.status(500).json({
        message: 'Error obteniendo turnos',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await this.service.getById(appointmentId);
      res.json(appointment);
    } catch (error: any) {
      if (error.message === 'Turno no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error obteniendo turno', { error: error.message });
      res.status(500).json({
        message: 'Error obteniendo turno',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { professionalId, patientId, appointmentDate, startTime, endTime, reason } = req.body;

      if (!professionalId || !patientId || !appointmentDate || !startTime || !endTime) {
        return res.status(400).json({
          message: 'Campos requeridos: professionalId, patientId, appointmentDate, startTime, endTime',
          code: 'BAD_REQUEST',
        });
      }

      // Normalizar la fecha para evitar problemas de timezone
      // Si viene como string "YYYY-MM-DD", crear la fecha en timezone local
      let normalizedDate: Date;
      if (typeof appointmentDate === 'string') {
        // Parsear fecha en formato YYYY-MM-DD y crear en timezone local
        const [year, month, day] = appointmentDate.split('-').map(Number);
        normalizedDate = new Date(year, month - 1, day);
        normalizedDate.setHours(0, 0, 0, 0);
      } else {
        normalizedDate = new Date(appointmentDate);
        normalizedDate.setHours(0, 0, 0, 0);
      }

      const appointment = await this.service.createAppointment({
        professionalId,
        patientId,
        appointmentDate: normalizedDate,
        startTime,
        endTime,
        reason,
      });

      res.status(201).json({
        appointment,
        message: 'Turno creado exitosamente. Estado: PENDING',
      });
    } catch (error: any) {
      if (error.message.includes('no encontrado') || error.message.includes('no disponible')) {
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
      logger.error('Error creando turno', { error: error.message });
      res.status(400).json({
        message: error.message || 'Error creando turno',
        code: 'BAD_REQUEST',
      });
    }
  };

  updateStatus = async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const { status } = req.body;

      if (!status || !Object.values(AppointmentStatus).includes(status)) {
        return res.status(400).json({
          message: 'Status inválido. Valores permitidos: CONFIRMED, CANCELLED, COMPLETED',
          code: 'BAD_REQUEST',
        });
      }

      const appointment = await this.service.updateStatus(appointmentId, status);
      res.json(appointment);
    } catch (error: any) {
      if (error.message === 'Turno no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error actualizando estado de turno', { error: error.message });
      res.status(400).json({
        message: error.message || 'Error actualizando estado',
        code: 'BAD_REQUEST',
      });
    }
  };

  cancel = async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const appointment = await this.service.cancel(appointmentId);
      res.json({
        message: 'Turno cancelado exitosamente',
        appointment,
      });
    } catch (error: any) {
      if (error.message === 'Turno no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error cancelando turno', { error: error.message });
      res.status(400).json({
        message: error.message || 'Error cancelando turno',
        code: 'BAD_REQUEST',
      });
    }
  };

  getAvailability = async (req: Request, res: Response) => {
    try {
      const { professionalId } = req.params;
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({
          message: 'Parámetro requerido: date',
          code: 'BAD_REQUEST',
        });
      }

      const availability = await this.service.getAvailability(
        professionalId,
        new Date(date as string)
      );
      res.json(availability);
    } catch (error: any) {
      if (error.message === 'Profesional no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error consultando disponibilidad', { error: error.message });
      res.status(500).json({
        message: 'Error consultando disponibilidad',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };
}

