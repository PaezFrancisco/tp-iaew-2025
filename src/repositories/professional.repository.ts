// ============================================
// REPOSITORIO DE PROFESIONALES
// ============================================

import prisma from '../config/database';
import { Professional, Prisma } from '@prisma/client';

export interface ProfessionalFilters {
  page?: number;
  limit?: number;
  specialty?: string;
  email?: string;
}

export class ProfessionalRepository {
  async findAll(filters: ProfessionalFilters = {}) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProfessionalWhereInput = {};
    if (filters.specialty) {
      where.specialty = { contains: filters.specialty, mode: 'insensitive' };
    }
    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      prisma.professional.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.professional.count({ where }),
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

  async findById(id: string): Promise<Professional | null> {
    return prisma.professional.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<Professional | null> {
    return prisma.professional.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.ProfessionalCreateInput): Promise<Professional> {
    return prisma.professional.create({ data });
  }

  async update(id: string, data: Prisma.ProfessionalUpdateInput): Promise<Professional> {
    return prisma.professional.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Professional> {
    return prisma.professional.delete({
      where: { id },
    });
  }
}

