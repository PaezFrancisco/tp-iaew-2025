import { Request, Response } from 'express';
import { PatientRepository } from '../repositories/patient.repository';
import { 
  ApiResponse, 
  CreatePatientRequest, 
  UpdatePatientRequest,
  PaginatedResponse,
  PaginationParams 
} from '../types';
import { createError } from '../middleware/error.middleware';

export class PatientController {
  private patientRepository: PatientRepository;

  constructor() {
    this.patientRepository = new PatientRepository();
  }

  // Crear un nuevo paciente
  public create = async (req: Request, res: Response): Promise<void> => {
    const data: CreatePatientRequest = req.body;

    // Verificar si ya existe un paciente con el mismo DNI
    const existingPatient = await this.patientRepository.existsByDni(data.dni);
    if (existingPatient) {
      throw createError('Ya existe un paciente con este DNI', 409);
    }

    // Verificar si ya existe un usuario con el mismo email
    const existingByEmail = await this.patientRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw createError('Ya existe un usuario con este email', 409);
    }

    const patient = await this.patientRepository.create(data);

    const response: ApiResponse = {
      success: true,
      data: patient,
      message: 'Paciente creado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  };

  // Obtener todos los pacientes con paginación
  public findAll = async (req: Request, res: Response): Promise<void> => {
    const params: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const { patients, total } = await this.patientRepository.findAll(params);

    const totalPages = Math.ceil(total / params.limit!);

    const response: PaginatedResponse<any> = {
      success: true,
      data: patients,
      message: 'Pacientes obtenidos exitosamente',
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

  // Obtener paciente por ID
  public findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const patient = await this.patientRepository.findById(id);
    if (!patient) {
      throw createError('Paciente no encontrado', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: patient,
      message: 'Paciente obtenido exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Obtener paciente por DNI
  public findByDni = async (req: Request, res: Response): Promise<void> => {
    const { dni } = req.params;

    const patient = await this.patientRepository.findByDni(dni);
    if (!patient) {
      throw createError('Paciente no encontrado', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: patient,
      message: 'Paciente obtenido exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Actualizar paciente
  public update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdatePatientRequest = req.body;

    // Verificar si el paciente existe
    const existingPatient = await this.patientRepository.findById(id);
    if (!existingPatient) {
      throw createError('Paciente no encontrado', 404);
    }

    const patient = await this.patientRepository.update(id, data);
    if (!patient) {
      throw createError('Error al actualizar el paciente', 500);
    }

    const response: ApiResponse = {
      success: true,
      data: patient,
      message: 'Paciente actualizado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Eliminar paciente
  public delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Verificar si el paciente existe
    const existingPatient = await this.patientRepository.findById(id);
    if (!existingPatient) {
      throw createError('Paciente no encontrado', 404);
    }

    const deleted = await this.patientRepository.delete(id);
    if (!deleted) {
      throw createError('Error al eliminar el paciente', 500);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Paciente eliminado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };
}
