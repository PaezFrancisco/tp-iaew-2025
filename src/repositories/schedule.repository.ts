// ============================================
// REPOSITORIO DE HORARIOS
// ============================================

import prisma from '../config/database';
import { ScheduleSlot, Prisma } from '@prisma/client';

export interface ScheduleFilters {
  professionalId: string;
  startDate?: Date;
  endDate?: Date;
  isAvailable?: boolean;
}

export class ScheduleRepository {
  async findByProfessional(filters: ScheduleFilters) {
    const where: Prisma.ScheduleSlotWhereInput = {
      professionalId: filters.professionalId,
    };

    if (filters.startDate || filters.endDate) {
      where.date = {};
      if (filters.startDate) {
        where.date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.date.lte = filters.endDate;
      }
    }

    if (filters.isAvailable !== undefined) {
      where.isAvailable = filters.isAvailable;
      where.isBlocked = false;
    }

    return prisma.scheduleSlot.findMany({
      where,
      orderBy: [
        { date: 'asc' },
        { startTime: 'asc' },
      ],
    });
  }

  async findAvailableSlot(
    professionalId: string,
    date: Date,
    startTime: string
  ): Promise<ScheduleSlot | null> {
    // Normalizar la fecha para comparar solo la parte de fecha (sin hora)
    // Esto evita problemas de timezone
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    return prisma.scheduleSlot.findFirst({
      where: {
        professionalId,
        date: {
          gte: normalizedDate,
          lt: new Date(normalizedDate.getTime() + 24 * 60 * 60 * 1000), // +1 día
        },
        startTime,
        isAvailable: true,
        isBlocked: false,
      },
    });
  }

  async blockSlot(
    id: string,
    blockedUntil: Date
  ): Promise<ScheduleSlot> {
    return prisma.scheduleSlot.update({
      where: { id },
      data: {
        isBlocked: true,
        blockedUntil,
      },
    });
  }

  async unblockSlot(id: string): Promise<ScheduleSlot> {
    return prisma.scheduleSlot.update({
      where: { id },
      data: {
        isBlocked: false,
        blockedUntil: null,
      },
    });
  }

  async createMany(data: Prisma.ScheduleSlotCreateManyInput[]): Promise<{ count: number }> {
    return prisma.scheduleSlot.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async updateMany(
    professionalId: string,
    data: Prisma.ScheduleSlotUpdateManyMutationInput,
    where?: Prisma.ScheduleSlotWhereInput
  ): Promise<{ count: number }> {
    return prisma.scheduleSlot.updateMany({
      where: {
        professionalId,
        ...where,
      },
      data,
    });
  }
}

