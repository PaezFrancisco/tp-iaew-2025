import { Request, Response } from 'express';
import { prisma } from '../database/prisma.service';
import { 
  ApiResponse, 
  CreateScheduleRequest, 
  UpdateScheduleRequest,
  ScheduleResponse 
} from '../types';
import { createError } from '../middleware/error.middleware';

export class ScheduleController {
  // Crear un nuevo horario
  public create = async (req: Request, res: Response): Promise<void> => {
    const data: CreateScheduleRequest = req.body;

    // Verificar si el profesional existe
    const professional = await prisma.professional.findUnique({
      where: { id: data.professionalId }
    });
    if (!professional) {
      throw createError('Profesional no encontrado', 404);
    }

    // Verificar si ya existe un horario para este día
    const existingSchedule = await prisma.schedule.findUnique({
      where: {
        professionalId_dayOfWeek: {
          professionalId: data.professionalId,
          dayOfWeek: data.dayOfWeek
        }
      }
    });

    if (existingSchedule) {
      throw createError('Ya existe un horario para este día de la semana', 409);
    }

    // Validar que la hora de inicio sea menor que la hora de fin
    const startTime = data.startTime.split(':').map(Number);
    const endTime = data.endTime.split(':').map(Number);
    const startMinutes = startTime[0] * 60 + startTime[1];
    const endMinutes = endTime[0] * 60 + endTime[1];

    if (startMinutes >= endMinutes) {
      throw createError('La hora de inicio debe ser menor que la hora de fin', 400);
    }

    const schedule = await prisma.schedule.create({
      data: {
        professionalId: data.professionalId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime
      }
    });

    const response: ApiResponse = {
      success: true,
      data: this.mapToResponse(schedule),
      message: 'Horario creado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  };

  // Obtener horarios por profesional
  public findByProfessional = async (req: Request, res: Response): Promise<void> => {
    const { professionalId } = req.params;

    // Verificar si el profesional existe
    const professional = await prisma.professional.findUnique({
      where: { id: professionalId }
    });
    if (!professional) {
      throw createError('Profesional no encontrado', 404);
    }

    const schedules = await prisma.schedule.findMany({
      where: { professionalId },
      orderBy: { dayOfWeek: 'asc' }
    });

    const response: ApiResponse = {
      success: true,
      data: schedules.map(schedule => this.mapToResponse(schedule)),
      message: 'Horarios obtenidos exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Obtener horario por ID
  public findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const schedule = await prisma.schedule.findUnique({
      where: { id }
    });

    if (!schedule) {
      throw createError('Horario no encontrado', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: this.mapToResponse(schedule),
      message: 'Horario obtenido exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Actualizar horario
  public update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdateScheduleRequest = req.body;

    // Verificar si el horario existe
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id }
    });
    if (!existingSchedule) {
      throw createError('Horario no encontrado', 404);
    }

    // Validar horas si se proporcionan
    if (data.startTime && data.endTime) {
      const startTime = data.startTime.split(':').map(Number);
      const endTime = data.endTime.split(':').map(Number);
      const startMinutes = startTime[0] * 60 + startTime[1];
      const endMinutes = endTime[0] * 60 + endTime[1];

      if (startMinutes >= endMinutes) {
        throw createError('La hora de inicio debe ser menor que la hora de fin', 400);
      }
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        startTime: data.startTime,
        endTime: data.endTime,
        isActive: data.isActive
      }
    });

    const response: ApiResponse = {
      success: true,
      data: this.mapToResponse(schedule),
      message: 'Horario actualizado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Eliminar horario
  public delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Verificar si el horario existe
    const existingSchedule = await prisma.schedule.findUnique({
      where: { id }
    });
    if (!existingSchedule) {
      throw createError('Horario no encontrado', 404);
    }

    await prisma.schedule.delete({
      where: { id }
    });

    const response: ApiResponse = {
      success: true,
      message: 'Horario eliminado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Mapear datos de Prisma a respuesta de la API
  private mapToResponse(schedule: any): ScheduleResponse {
    return {
      id: schedule.id,
      professionalId: schedule.professionalId,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isActive: schedule.isActive,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString()
    };
  }
}
