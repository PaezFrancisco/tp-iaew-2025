import { prisma } from '../database/prisma.service';
import { 
  CreatePatientRequest, 
  UpdatePatientRequest, 
  PatientResponse,
  PaginationParams 
} from '../types';

export class PatientRepository {
  // Crear un nuevo paciente
  async create(data: CreatePatientRequest): Promise<PatientResponse> {
    const patient = await prisma.patient.create({
      data: {
        user: {
          create: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone
          }
        },
        dni: data.dni,
        birthDate: new Date(data.birthDate),
        address: data.address,
        medicalHistory: data.medicalHistory
      },
      include: {
        user: true
      }
    });

    return this.mapToResponse(patient);
  }

  // Obtener paciente por ID
  async findById(id: string): Promise<PatientResponse | null> {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    return patient ? this.mapToResponse(patient) : null;
  }

  // Obtener paciente por DNI
  async findByDni(dni: string): Promise<PatientResponse | null> {
    const patient = await prisma.patient.findUnique({
      where: { dni },
      include: {
        user: true
      }
    });

    return patient ? this.mapToResponse(patient) : null;
  }

  // Obtener paciente por email
  async findByEmail(email: string): Promise<PatientResponse | null> {
    const patient = await prisma.patient.findFirst({
      where: {
        user: {
          email: email
        }
      },
      include: {
        user: true
      }
    });

    return patient ? this.mapToResponse(patient) : null;
  }

  // Obtener todos los pacientes con paginación
  async findAll(params: PaginationParams = {}): Promise<{
    patients: PatientResponse[];
    total: number;
  }> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder
        },
        include: {
          user: true
        }
      }),
      prisma.patient.count()
    ]);

    return {
      patients: patients.map(patient => this.mapToResponse(patient)),
      total
    };
  }

  // Actualizar paciente
  async update(id: string, data: UpdatePatientRequest): Promise<PatientResponse | null> {
    const patient = await prisma.patient.update({
      where: { id },
      data: {
        address: data.address,
        medicalHistory: data.medicalHistory,
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

    return this.mapToResponse(patient);
  }

  // Eliminar paciente
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.patient.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Verificar si existe un paciente con el DNI dado
  async existsByDni(dni: string, excludeId?: string): Promise<boolean> {
    const patient = await prisma.patient.findFirst({
      where: {
        dni,
        ...(excludeId && { id: { not: excludeId } })
      }
    });

    return !!patient;
  }

  // Mapear datos de Prisma a respuesta de la API
  private mapToResponse(patient: any): PatientResponse {
    return {
      id: patient.id,
      email: patient.user.email,
      firstName: patient.user.firstName,
      lastName: patient.user.lastName,
      phone: patient.user.phone,
      dni: patient.dni,
      birthDate: patient.birthDate.toISOString().split('T')[0],
      address: patient.address,
      medicalHistory: patient.medicalHistory,
      createdAt: patient.createdAt.toISOString(),
      updatedAt: patient.updatedAt.toISOString()
    };
  }
}
