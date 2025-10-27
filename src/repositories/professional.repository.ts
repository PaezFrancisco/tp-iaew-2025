import { prisma } from '../database/prisma.service';
import { 
  CreateProfessionalRequest, 
  UpdateProfessionalRequest, 
  ProfessionalResponse,
  PaginationParams 
} from '../types';

export class ProfessionalRepository {
  // Crear un nuevo profesional
  async create(data: CreateProfessionalRequest): Promise<ProfessionalResponse> {
    const professional = await prisma.professional.create({
      data: {
        user: {
          create: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          }
        },
        license: data.license,
        specialty: data.specialty,
        experience: data.experience || 0,
        consultationFee: data.consultationFee
      },
      include: {
        user: true
      }
    });

    return this.mapToResponse(professional);
  }

  // Obtener profesional por ID
  async findById(id: string): Promise<ProfessionalResponse | null> {
    const professional = await prisma.professional.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    return professional ? this.mapToResponse(professional) : null;
  }

  // Obtener profesional por matrícula
  async findByLicense(license: string): Promise<ProfessionalResponse | null> {
    const professional = await prisma.professional.findUnique({
      where: { license },
      include: {
        user: true
      }
    });

    return professional ? this.mapToResponse(professional) : null;
  }

  // Obtener profesional por email
  async findByEmail(email: string): Promise<ProfessionalResponse | null> {
    const professional = await prisma.professional.findFirst({
      where: {
        user: {
          email: email
        }
      },
      include: {
        user: true
      }
    });

    return professional ? this.mapToResponse(professional) : null;
  }

  // Obtener profesionales por especialidad
  async findBySpecialty(specialty: string, params: PaginationParams = {}): Promise<{
    professionals: ProfessionalResponse[];
    total: number;
  }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [professionals, total] = await Promise.all([
      prisma.professional.findMany({
        where: {
          specialty: {
            contains: specialty,
            mode: 'insensitive'
          }
        },
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          user: true
        }
      }),
      prisma.professional.count({
        where: {
          specialty: {
            contains: specialty,
            mode: 'insensitive'
          }
        }
      })
    ]);

    return {
      professionals: professionals.map(professional => this.mapToResponse(professional)),
      total
    };
  }

  // Obtener todos los profesionales con paginación
  async findAll(params: PaginationParams = {}): Promise<{
    professionals: ProfessionalResponse[];
    total: number;
  }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [professionals, total] = await Promise.all([
      prisma.professional.findMany({
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          user: true
        }
      }),
      prisma.professional.count()
    ]);

    return {
      professionals: professionals.map(professional => this.mapToResponse(professional)),
      total
    };
  }

  // Actualizar profesional
  async update(id: string, data: UpdateProfessionalRequest): Promise<ProfessionalResponse | null> {
    const professional = await prisma.professional.update({
      where: { id },
      data: {
        specialty: data.specialty,
        experience: data.experience,
        consultationFee: data.consultationFee,
        user: {
          update: {
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          }
        }
      },
      include: {
        user: true
      }
    });

    return this.mapToResponse(professional);
  }

  // Eliminar profesional
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.professional.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Verificar si existe un profesional con la matrícula dada
  async existsByLicense(license: string, excludeId?: string): Promise<boolean> {
    const professional = await prisma.professional.findFirst({
      where: {
        license,
        ...(excludeId && { id: { not: excludeId } })
      }
    });

    return !!professional;
  }

  // Mapear datos de Prisma a respuesta de la API
  private mapToResponse(professional: any): ProfessionalResponse {
    return {
      id: professional.id,
      email: professional.user.email,
      firstName: professional.user.firstName,
      lastName: professional.user.lastName,
      phone: professional.user.phone,
      license: professional.license,
      specialty: professional.specialty,
      experience: professional.experience,
      consultationFee: Number(professional.consultationFee),
      createdAt: professional.createdAt.toISOString(),
      updatedAt: professional.updatedAt.toISOString()
    };
  }
}
