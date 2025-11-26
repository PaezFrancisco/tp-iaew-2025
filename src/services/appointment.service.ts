// ============================================
// SERVICIO DE TURNOS - TRANSACCIÓN MULTI-PASO
// ============================================

import prisma from '../config/database';
import { AppointmentRepository, AppointmentFilters } from '../repositories/appointment.repository';
import { ScheduleRepository } from '../repositories/schedule.repository';
import { PatientRepository } from '../repositories/patient.repository';
import { ProfessionalRepository } from '../repositories/professional.repository';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { publishMessage, EXCHANGES, QUEUES } from '../config/rabbitmq';
import logger from '../config/logger';

export interface CreateAppointmentData {
  professionalId: string;
  patientId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  reason?: string;
}

export class AppointmentService {
  private appointmentRepo: AppointmentRepository;
  private scheduleRepo: ScheduleRepository;
  private patientRepo: PatientRepository;
  private professionalRepo: ProfessionalRepository;

  constructor() {
    this.appointmentRepo = new AppointmentRepository();
    this.scheduleRepo = new ScheduleRepository();
    this.patientRepo = new PatientRepository();
    this.professionalRepo = new ProfessionalRepository();
  }

  async getAll(filters: AppointmentFilters = {}) {
    logger.info('Obteniendo lista de turnos', {
      resource: 'appointment',
      operation: 'list',
      filters,
    });
    return this.appointmentRepo.findAll(filters);
  }

  async getById(id: string) {
    logger.info('Obteniendo turno por ID', {
      resource: 'appointment',
      operation: 'getById',
      appointmentId: id,
    });
    const appointment = await this.appointmentRepo.findById(id);
    
    if (!appointment) {
      throw new Error('Turno no encontrado');
    }
    
    return appointment;
  }

  // ============================================
  // TRANSACCIÓN MULTI-PASO: RESERVA DE TURNO
  // ============================================
  async createAppointment(data: CreateAppointmentData) {
    logger.info('Iniciando reserva de turno', {
      resource: 'appointment',
      operation: 'create',
      professionalId: data.professionalId,
      patientId: data.patientId,
      appointmentDate: data.appointmentDate,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    // PASO 1: Verificar que el paciente y profesional existan
    const [patient, professional] = await Promise.all([
      this.patientRepo.findById(data.patientId),
      this.professionalRepo.findById(data.professionalId),
    ]);

    if (!patient) {
      throw new Error('Paciente no encontrado');
    }
    if (!professional) {
      throw new Error('Profesional no encontrado');
    }

    // PASO 2: Verificar disponibilidad del slot
    const availableSlot = await this.scheduleRepo.findAvailableSlot(
      data.professionalId,
      data.appointmentDate,
      data.startTime
    );

    if (!availableSlot) {
      throw new Error('Horario no disponible');
    }

    // PASO 3: Transacción ACID - Bloqueo temporal y creación de appointment
    const appointment = await prisma.$transaction(async (tx) => {
      // Verificar nuevamente disponibilidad dentro de la transacción (optimistic locking)
      const slot = await tx.scheduleSlot.findFirst({
        where: {
          id: availableSlot.id,
          isAvailable: true,
          isBlocked: false,
        },
      });

      if (!slot) {
        throw new Error('Horario ya no está disponible');
      }

      // Bloquear temporalmente el slot (5 minutos)
      const blockedUntil = new Date(Date.now() + 5 * 60 * 1000);
      await tx.scheduleSlot.update({
        where: { id: slot.id },
        data: {
          isBlocked: true,
          blockedUntil,
        },
      });

      // Normalizar la fecha del appointment para la búsqueda
      const normalizedAppointmentDate = new Date(data.appointmentDate);
      normalizedAppointmentDate.setHours(0, 0, 0, 0);

      // Verificar que no exista otro appointment para el mismo horario
      const existingAppointment = await tx.appointment.findUnique({
        where: {
          professionalId_appointmentDate_startTime: {
            professionalId: data.professionalId,
            appointmentDate: normalizedAppointmentDate,
            startTime: data.startTime,
          },
        },
      });

      if (existingAppointment) {
        throw new Error('Ya existe un turno para ese horario');
      }

      // Crear appointment en estado PENDING
      const newAppointment = await tx.appointment.create({
        data: {
          professionalId: data.professionalId,
          patientId: data.patientId,
          appointmentDate: normalizedAppointmentDate,
          startTime: data.startTime,
          endTime: data.endTime,
          reason: data.reason,
          status: AppointmentStatus.PENDING,
        },
        include: {
          professional: true,
          patient: true,
        },
      });

      logger.info('Turno creado en transacción', {
        resource: 'appointment',
        operation: 'create',
        appointmentId: newAppointment.id,
        professionalId: newAppointment.professionalId,
        patientId: newAppointment.patientId,
      });
      return newAppointment;
    });

    // PASO 4: Publicar evento asincrónico a RabbitMQ
    try {
      await publishMessage(
        EXCHANGES.APPOINTMENTS,
        'appointment.created',
        {
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          appointmentDate: appointment.appointmentDate.toISOString(),
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          status: appointment.status,
          timestamp: new Date().toISOString(),
        }
      );
      logger.info('Evento appointment.created publicado a RabbitMQ', {
        resource: 'appointment',
        operation: 'publishEvent',
        eventType: 'appointment.created',
        appointmentId: appointment.id,
        professionalId: appointment.professionalId,
        patientId: appointment.patientId,
      });
    } catch (error: any) {
      logger.error('Error publicando evento a RabbitMQ', { error: error.message, appointmentId: appointment.id });
      // No fallar la transacción si falla el evento, pero loguear el error
    }

    return appointment;
  }

  async updateStatus(id: string, status: AppointmentStatus) {
    logger.info('Actualizando estado de turno', {
      resource: 'appointment',
      operation: 'updateStatus',
      appointmentId: id,
      status,
    });
    
    const appointment = await this.appointmentRepo.findById(id);
    if (!appointment) {
      throw new Error('Turno no encontrado');
    }

    // Validaciones de negocio
    if (status === AppointmentStatus.CANCELLED && appointment.status === AppointmentStatus.COMPLETED) {
      throw new Error('No se puede cancelar un turno completado');
    }

    const updated = await this.appointmentRepo.update(id, { status });

    // Publicar evento si se confirma
    if (status === AppointmentStatus.CONFIRMED) {
      try {
        await publishMessage(
          EXCHANGES.APPOINTMENTS,
          'appointment.confirmed',
          {
            appointmentId: updated.id,
            timestamp: new Date().toISOString(),
          }
        );
        logger.info('Evento appointment.confirmed publicado', {
          resource: 'appointment',
          operation: 'publishEvent',
          eventType: 'appointment.confirmed',
          appointmentId: updated.id,
        });
      } catch (error: any) {
        logger.error('Error publicando evento de confirmación', { error: error.message });
      }
    }

    return updated;
  }

  async cancel(id: string) {
    logger.info('Cancelando turno', {
      resource: 'appointment',
      operation: 'cancel',
      appointmentId: id,
    });
    
    const appointment = await this.getById(id);
    
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new Error('No se puede cancelar un turno completado');
    }

    // Desbloquear el slot si estaba bloqueado
    const scheduleRepo = new ScheduleRepository();
    const slot = await scheduleRepo.findAvailableSlot(
      appointment.professionalId,
      appointment.appointmentDate,
      appointment.startTime
    );

    if (slot && slot.isBlocked) {
      await scheduleRepo.unblockSlot(slot.id);
    }

    return this.updateStatus(id, AppointmentStatus.CANCELLED);
  }

  async getAvailability(professionalId: string, date: Date) {
    logger.info('Consultando disponibilidad', {
      resource: 'appointment',
      operation: 'getAvailability',
      professionalId,
      date,
    });
    
    const professional = await this.professionalRepo.findById(professionalId);
    if (!professional) {
      throw new Error('Profesional no encontrado');
    }

    const slots = await this.scheduleRepo.findByProfessional({
      professionalId,
      startDate: date,
      endDate: date,
      isAvailable: true,
    });

    // Obtener appointments existentes para ese día
    const appointments = await this.appointmentRepo.findAll({
      professionalId,
      startDate: date,
      endDate: date,
      limit: 1000,
    });

    // Marcar slots como no disponibles si hay appointments
    const availableSlots = slots.map(slot => {
      const hasAppointment = appointments.data.some(
        (apt: any) => apt.startTime === slot.startTime && apt.status !== AppointmentStatus.CANCELLED
      );
      return {
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: !hasAppointment && !slot.isBlocked,
      };
    });

    return {
      professional,
      date: date.toISOString().split('T')[0],
      availableSlots,
    };
  }
}

