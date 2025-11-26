// ============================================
// SERVICIO DE PROFESIONALES
// ============================================

import { ProfessionalRepository, ProfessionalFilters } from '../repositories/professional.repository';
import { Prisma } from '@prisma/client';
import logger from '../config/logger';

export class ProfessionalService {
  private repository: ProfessionalRepository;

  constructor() {
    this.repository = new ProfessionalRepository();
  }

  async getAll(filters: ProfessionalFilters = {}) {
    logger.info('Obteniendo lista de profesionales', {
      resource: 'professional',
      operation: 'list',
      filters,
    });
    return this.repository.findAll(filters);
  }

  async getById(id: string) {
    logger.info('Obteniendo profesional por ID', {
      resource: 'professional',
      operation: 'getById',
      professionalId: id,
    });
    const professional = await this.repository.findById(id);
    
    if (!professional) {
      throw new Error('Profesional no encontrado');
    }
    
    return professional;
  }

  async create(data: Prisma.ProfessionalCreateInput) {
    logger.info('Creando nuevo profesional', {
      resource: 'professional',
      operation: 'create',
      email: data.email,
    });
    
    // Verificar si el email ya existe
    const existing = await this.repository.findByEmail(data.email as string);
    if (existing) {
      throw new Error('Ya existe un profesional con ese email');
    }

    // Verificar si el número de licencia ya existe
    if (data.licenseNumber) {
      // Esta verificación debería hacerse en el repositorio, pero por simplicidad aquí
      const existingLicense = await this.repository.findAll({ limit: 1000 });
      const licenseExists = existingLicense.data.some(
        (p: any) => p.licenseNumber === data.licenseNumber
      );
      if (licenseExists) {
        throw new Error('Ya existe un profesional con ese número de licencia');
      }
    }

    const professional = await this.repository.create(data);
    logger.info('Profesional creado exitosamente', {
      resource: 'professional',
      operation: 'create',
      professionalId: professional.id,
    });
    return professional;
  }

  async update(id: string, data: Prisma.ProfessionalUpdateInput) {
    logger.info('Actualizando profesional', {
      resource: 'professional',
      operation: 'update',
      professionalId: id,
    });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Profesional no encontrado');
    }

    // Si se actualiza el email, verificar que no exista
    if (data.email && typeof data.email === 'string') {
      const emailExists = await this.repository.findByEmail(data.email);
      if (emailExists && emailExists.id !== id) {
        throw new Error('Ya existe un profesional con ese email');
      }
    }

    const professional = await this.repository.update(id, data);
    logger.info('Profesional actualizado exitosamente', {
      resource: 'professional',
      operation: 'update',
      professionalId: id,
    });
    return professional;
  }

  async delete(id: string) {
    logger.info('Eliminando profesional', {
      resource: 'professional',
      operation: 'delete',
      professionalId: id,
    });
    
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new Error('Profesional no encontrado');
    }

    await this.repository.delete(id);
    logger.info('Profesional eliminado exitosamente', {
      resource: 'professional',
      operation: 'delete',
      professionalId: id,
    });
  }
}

