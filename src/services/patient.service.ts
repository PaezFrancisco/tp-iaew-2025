// ============================================
// SERVICIO DE PACIENTES
// ============================================

import { PatientRepository, PatientFilters } from '../repositories/patient.repository';
import { Prisma } from '@prisma/client';
import logger from '../config/logger';

export class PatientService {
  private repository: PatientRepository;

  constructor() {
    this.repository = new PatientRepository();
  }

  async getAll(filters: PatientFilters = {}) {
    logger.info('Obteniendo lista de pacientes', {
      resource: 'patient',
      operation: 'list',
      filters,
    });
    return this.repository.findAll(filters);
  }

  async getById(id: string) {
    logger.info('Obteniendo paciente por ID', {
      resource: 'patient',
      operation: 'getById',
      patientId: id,
    });
    const patient = await this.repository.findById(id);
    
    if (!patient) {
      throw new Error('Paciente no encontrado');
    }
    
    return patient;
  }

  async create(data: Prisma.PatientCreateInput) {
    logger.info('Creando nuevo paciente', {
      resource: 'patient',
      operation: 'create',
      email: data.email,
    });
    
    // Verificar si el email ya existe
    const existing = await this.repository.findByEmail(data.email as string);
    if (existing) {
      throw new Error('Ya existe un paciente con ese email');
    }

    const patient = await this.repository.create(data);
    logger.info('Paciente creado exitosamente', {
      resource: 'patient',
      operation: 'create',
      patientId: patient.id,
    });
    return patient;
  }

  async update(id: string, data: Prisma.PatientUpdateInput) {
    logger.info('Actualizando paciente', {
      resource: 'patient',
      operation: 'update',
      patientId: id,
    });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Paciente no encontrado');
    }

    // Si se actualiza el email, verificar que no exista
    if (data.email && typeof data.email === 'string') {
      const emailExists = await this.repository.findByEmail(data.email);
      if (emailExists && emailExists.id !== id) {
        throw new Error('Ya existe un paciente con ese email');
      }
    }

    const patient = await this.repository.update(id, data);
    logger.info('Paciente actualizado exitosamente', {
      resource: 'patient',
      operation: 'update',
      patientId: id,
    });
    return patient;
  }

  async delete(id: string) {
    logger.info('Eliminando paciente', {
      resource: 'patient',
      operation: 'delete',
      patientId: id,
    });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Paciente no encontrado');
    }

    await this.repository.delete(id);
    logger.info('Paciente eliminado exitosamente', {
      resource: 'patient',
      operation: 'delete',
      patientId: id,
    });
  }
}

