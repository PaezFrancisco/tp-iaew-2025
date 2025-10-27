import { Request, Response } from 'express';
import { prisma } from '../database/prisma.service';
import { 
  ApiResponse, 
  CreateAppointmentRequest, 
  UpdateAppointmentRequest,
  AppointmentResponse,
  AvailabilityRequest,
  AvailabilityResponse,
  TimeSlot,
  PaginatedResponse,
  PaginationParams 
} from '../types';
import { createError } from '../middleware/error.middleware';

export class AppointmentController {
  // Crear un nuevo turno
  public create = async (req: Request, res: Response): Promise<void> => {
    const data: CreateAppointmentRequest = req.body;

    // Verificar si el paciente existe
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId }
    });
    if (!patient) {
      throw createError('Paciente no encontrado', 404);
    }

    // Verificar si el profesional existe
    const professional = await prisma.professional.findUnique({
      where: { id: data.professionalId }
    });
    if (!professional) {
      throw createError('Profesional no encontrado', 404);
    }

    // Verificar disponibilidad
    const appointmentDate = new Date(data.date);
    const dayOfWeek = appointmentDate.getDay();

    // Verificar si el profesional tiene horario para ese día
    const schedule = await prisma.schedule.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId: data.professionalId,
          dayOfWeek: dayOfWeek
        }
      }
    });

    if (!schedule || !schedule.isActive) {
      throw createError('El profesional no tiene horario disponible para este día', 400);
    }

    // Verificar si ya existe un turno en ese horario
    const existingAppointment = await prisma.appointment.findFirst({
      where: {
        professionalId: data.professionalId,
        date: appointmentDate,
        startTime: data.startTime,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    });

    if (existingAppointment) {
      throw createError('Ya existe un turno en ese horario', 409);
    }

    // Validar que el horario esté dentro del horario del profesional
    const startTime = data.startTime.split(':').map(Number);
    const endTime = data.endTime.split(':').map(Number);
    const scheduleStart = schedule.startTime.split(':').map(Number);
    const scheduleEnd = schedule.endTime.split(':').map(Number);

    const appointmentStartMinutes = startTime[0] * 60 + startTime[1];
    const appointmentEndMinutes = endTime[0] * 60 + endTime[1];
    const scheduleStartMinutes = scheduleStart[0] * 60 + scheduleStart[1];
    const scheduleEndMinutes = scheduleEnd[0] * 60 + scheduleEnd[1];

    if (appointmentStartMinutes < scheduleStartMinutes || appointmentEndMinutes > scheduleEndMinutes) {
      throw createError('El horario del turno debe estar dentro del horario del profesional', 400);
    }

    const appointment = await prisma.appointment.create({
      data: {
        patientId: data.patientId,
        professionalId: data.professionalId,
        date: appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        notes: data.notes
      },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      data: this.mapToResponse(appointment),
      message: 'Turno creado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  };

  // Obtener todos los turnos con paginación
  public findAll = async (req: Request, res: Response): Promise<void> => {
    const params: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const skip = (params.page! - 1) * params.limit!;

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        skip,
        take: params.limit,
        orderBy: {
          [params.sortBy!]: params.sortOrder
        },
        include: {
          patient: {
            include: {
              user: true
            }
          },
          professional: {
            include: {
              user: true
            }
          }
        }
      }),
      prisma.appointment.count()
    ]);

    const totalPages = Math.ceil(total / params.limit!);

    const response: PaginatedResponse<any> = {
      success: true,
      data: appointments.map(appointment => this.mapToResponse(appointment)),
      message: 'Turnos obtenidos exitosamente',
      timestamp: new Date().toISOString(),
      pagination: {
        page: params.page!,
        limit: params.limit!,
        total,
        totalPages,
        hasNext: params.page! < totalPages,
        hasPrev: params.page! > 1
      }
    };

    res.status(200).json(response);
  };

  // Obtener turnos por paciente
  public findByPatient = async (req: Request, res: Response): Promise<void> => {
    const { patientId } = req.params;

    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { date: 'asc' },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      data: appointments.map(appointment => this.mapToResponse(appointment)),
      message: 'Turnos del paciente obtenidos exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Obtener turnos por profesional
  public findByProfessional = async (req: Request, res: Response): Promise<void> => {
    const { professionalId } = req.params;

    const appointments = await prisma.appointment.findMany({
      where: { professionalId },
      orderBy: { date: 'asc' },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      data: appointments.map(appointment => this.mapToResponse(appointment)),
      message: 'Turnos del profesional obtenidos exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Obtener disponibilidad de un profesional para una fecha
  public getAvailability = async (req: Request, res: Response): Promise<void> => {
    const { professionalId } = req.params;
    const { date } = req.query;

    if (!date) {
      throw createError('Fecha es requerida', 400);
    }

    const appointmentDate = new Date(date as string);
    const dayOfWeek = appointmentDate.getDay();

    // Obtener horario del profesional para ese día
    const schedule = await prisma.schedule.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId,
          dayOfWeek: dayOfWeek
        }
      }
    });

    if (!schedule || !schedule.isActive) {
      const response: ApiResponse = {
        success: true,
        data: {
          professionalId,
          date: date as string,
          timeSlots: []
        },
        message: 'No hay horario disponible para este día',
        timestamp: new Date().toISOString()
      };
      res.status(200).json(response);
      return;
    }

    // Obtener turnos existentes para esa fecha
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        professionalId,
        date: appointmentDate,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    });

    // Generar slots de tiempo de 30 minutos
    const timeSlots: TimeSlot[] = [];
    const startTime = schedule.startTime.split(':').map(Number);
    const endTime = schedule.endTime.split(':').map(Number);
    
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
      
      const isBooked = existingAppointments.some(apt => apt.startTime === timeString);
      
      timeSlots.push({
        time: timeString,
        available: !isBooked
      });
    }

    const response: ApiResponse = {
      success: true,
      data: {
        professionalId,
        date: date as string,
        timeSlots
      },
      message: 'Disponibilidad obtenida exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Obtener turno por ID
  public findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    if (!appointment) {
      throw createError('Turno no encontrado', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: this.mapToResponse(appointment),
      message: 'Turno obtenido exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Actualizar turno
  public update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdateAppointmentRequest = req.body;

    // Verificar si el turno existe
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });
    if (!existingAppointment) {
      throw createError('Turno no encontrado', 404);
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        date: data.date ? new Date(data.date) : undefined,
        startTime: data.startTime,
        endTime: data.endTime,
        status: data.status,
        notes: data.notes
      },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    const response: ApiResponse = {
      success: true,
      data: this.mapToResponse(appointment),
      message: 'Turno actualizado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Eliminar turno
  public delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Verificar si el turno existe
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    });
    if (!existingAppointment) {
      throw createError('Turno no encontrado', 404);
    }

    await prisma.appointment.delete({
      where: { id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Turno eliminado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Mapear datos de Prisma a respuesta de la API
  private mapToResponse(appointment: any): AppointmentResponse {
    return {
      id: appointment.id,
      patientId: appointment.patientId,
      professionalId: appointment.professionalId,
      date: appointment.date.toISOString().split('T')[0],
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      notes: appointment.notes,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
      patient: appointment.patient ? {
        firstName: appointment.patient.user.firstName,
        lastName: appointment.patient.user.lastName,
        dni: appointment.patient.dni
      } : undefined,
      professional: appointment.professional ? {
        firstName: appointment.professional.user.firstName,
        lastName: appointment.professional.user.lastName,
        specialty: appointment.professional.specialty,
        license: appointment.professional.license
      } : undefined
    };
  }
}
