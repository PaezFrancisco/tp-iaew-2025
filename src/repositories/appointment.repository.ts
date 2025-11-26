// ============================================
// REPOSITORIO DE TURNOS
// ============================================

import prisma from '../config/database';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';

export interface AppointmentFilters {
  page?: number;
  limit?: number;
  status?: AppointmentStatus;
  professionalId?: string;
  patientId?: string;
  startDate?: Date;
  endDate?: Date;
}

export class AppointmentRepository {
  async findAll(filters: AppointmentFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.AppointmentWhereInput = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.professionalId) {
      where.professionalId = filters.professionalId;
    }
    if (filters.patientId) {
      where.patientId = filters.patientId;
    }
    if (filters.startDate || filters.endDate) {
      where.appointmentDate = {};
      if (filters.startDate) {
        where.appointmentDate.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.appointmentDate.lte = filters.endDate;
      }
    }

    const [data, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        include: {
          professional: true,
          patient: true,
        },
        orderBy: { appointmentDate: 'asc' },
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    return prisma.appointment.findUnique({
      where: { id },
      include: {
        professional: true,
        patient: true,
      },
    });
  }

  async create(data: Prisma.AppointmentCreateInput): Promise<Appointment> {
    return prisma.appointment.create({
      data,
      include: {
        professional: true,
        patient: true,
      },
    });
  }

  async update(id: string, data: Prisma.AppointmentUpdateInput): Promise<Appointment> {
    return prisma.appointment.update({
      where: { id },
      data,
      include: {
        professional: true,
        patient: true,
      },
    });
  }

  async updateWebhookStatus(
    id: string,
    webhookSent: boolean,
    webhookAttempts: number,
    webhookResponse?: string
  ): Promise<Appointment> {
    return prisma.appointment.update({
      where: { id },
      data: {
        webhookSent,
        webhookAttempts,
        webhookResponse,
        lastWebhookAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<Appointment> {
    return prisma.appointment.delete({
      where: { id },
    });
  }
}

