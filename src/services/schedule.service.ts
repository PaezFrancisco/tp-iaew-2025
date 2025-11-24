// ============================================
// SERVICIO DE HORARIOS
// ============================================

import { ScheduleRepository, ScheduleFilters } from '../repositories/schedule.repository';
import { ProfessionalRepository } from '../repositories/professional.repository';
import logger from '../config/logger';

export interface CreateScheduleSlotData {
  date: Date;
  startTime: string;
  endTime: string;
  isAvailable?: boolean;
}

export class ScheduleService {
  private scheduleRepo: ScheduleRepository;
  private professionalRepo: ProfessionalRepository;

  constructor() {
    this.scheduleRepo = new ScheduleRepository();
    this.professionalRepo = new ProfessionalRepository();
  }

  async getSchedule(professionalId: string, filters: Omit<ScheduleFilters, 'professionalId'> = {}) {
    logger.info('Obteniendo horarios de profesional', { professionalId, filters });
    
    const professional = await this.professionalRepo.findById(professionalId);
    if (!professional) {
      throw new Error('Profesional no encontrado');
    }

    const schedule = await this.scheduleRepo.findByProfessional({
      professionalId,
      ...filters,
    });

    return {
      professional,
      schedule,
    };
  }

  async updateSchedule(professionalId: string, slots: CreateScheduleSlotData[]) {
    logger.info('Actualizando horarios de profesional', { professionalId, slotsCount: slots.length });
    
    const professional = await this.professionalRepo.findById(professionalId);
    if (!professional) {
      throw new Error('Profesional no encontrado');
    }

    const scheduleData = slots.map(slot => ({
      professionalId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      isAvailable: slot.isAvailable ?? true,
      isBlocked: false,
    }));

    await this.scheduleRepo.createMany(scheduleData);
    
    const updatedSchedule = await this.scheduleRepo.findByProfessional({
      professionalId,
    });

    return {
      schedule: updatedSchedule,
    };
  }
}

