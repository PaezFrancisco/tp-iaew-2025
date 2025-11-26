// ============================================
// REPOSITORIO DE PACIENTES
// ============================================

import prisma from '../config/database';
import { Patient, Prisma } from '@prisma/client';

export interface PatientFilters {
  page?: number;
  limit?: number;
  email?: string;
}

export class PatientRepository {
  async findAll(filters: PatientFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.PatientWhereInput = {};
    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where }),
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

  async findById(id: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<Patient | null> {
    return prisma.patient.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.PatientCreateInput): Promise<Patient> {
    return prisma.patient.create({ data });
  }

  async update(id: string, data: Prisma.PatientUpdateInput): Promise<Patient> {
    return prisma.patient.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Patient> {
    return prisma.patient.delete({
      where: { id },
    });
  }
}

