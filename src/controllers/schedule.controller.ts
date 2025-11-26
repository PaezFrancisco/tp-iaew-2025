// ============================================
// CONTROLADOR DE HORARIOS
// ============================================

import { Request, Response } from 'express';
import { ScheduleService } from '../services/schedule.service';
import logger from '../config/logger';

export class ScheduleController {
  private service: ScheduleService;

  constructor() {
    this.service = new ScheduleService();
  }

  getSchedule = async (req: Request, res: Response) => {
    try {
      const { professionalId } = req.params;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const result = await this.service.getSchedule(professionalId, {
        startDate,
        endDate,
      });
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Profesional no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error obteniendo horarios', { error: error.message });
      res.status(500).json({
        message: 'Error obteniendo horarios',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };

  updateSchedule = async (req: Request, res: Response) => {
    try {
      const { professionalId } = req.params;
      const { slots } = req.body;

      if (!slots || !Array.isArray(slots)) {
        return res.status(400).json({
          message: 'Se requiere un array de slots',
          code: 'BAD_REQUEST',
        });
      }

      const scheduleData = slots.map((slot: any) => ({
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: slot.isAvailable ?? true,
      }));

      const result = await this.service.updateSchedule(professionalId, scheduleData);
      res.json(result);
    } catch (error: any) {
      if (error.message === 'Profesional no encontrado') {
        return res.status(404).json({
          message: error.message,
          code: 'NOT_FOUND',
        });
      }
      logger.error('Error actualizando horarios', { error: error.message });
      res.status(500).json({
        message: 'Error actualizando horarios',
        code: 'INTERNAL_SERVER_ERROR',
      });
    }
  };
}

