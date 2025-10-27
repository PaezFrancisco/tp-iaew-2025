import { Request, Response } from 'express';
import { ProfessionalRepository } from '../repositories/professional.repository';
import { 
  ApiResponse, 
  CreateProfessionalRequest, 
  UpdateProfessionalRequest,
  PaginatedResponse,
  PaginationParams 
} from '../types';
import { createError } from '../middleware/error.middleware';

export class ProfessionalController {
  private professionalRepository: ProfessionalRepository;

  constructor() {
    this.professionalRepository = new ProfessionalRepository();
  }

  // Crear un nuevo profesional
  public create = async (req: Request, res: Response): Promise<void> => {
    const data: CreateProfessionalRequest = req.body;

    // Verificar si ya existe un profesional con la misma matrícula
    const existingProfessional = await this.professionalRepository.existsByLicense(data.license);
    if (existingProfessional) {
      throw createError('Ya existe un profesional con esta matrícula', 409);
    }

    // Verificar si ya existe un usuario con el mismo email
    const existingByEmail = await this.professionalRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw createError('Ya existe un usuario con este email', 409);
    }

    const professional = await this.professionalRepository.create(data);

    const response: ApiResponse = {
      success: true,
      data: professional,
      message: 'Profesional creado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(201).json(response);
  };

  // Obtener todos los profesionales con paginación
  public findAll = async (req: Request, res: Response): Promise<void> => {
    const params: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const { professionals, total } = await this.professionalRepository.findAll(params);

    const totalPages = Math.ceil(total / params.limit!);

    const response: PaginatedResponse<any> = {
      success: true,
      data: professionals,
      message: 'Profesionales obtenidos exitosamente',
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

  // Obtener profesionales por especialidad
  public findBySpecialty = async (req: Request, res: Response): Promise<void> => {
    const { specialty } = req.params;
    const params: PaginationParams = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 10,
      sortBy: req.query.sortBy as string || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc'
    };

    const { professionals, total } = await this.professionalRepository.findBySpecialty(specialty, params);

    const totalPages = Math.ceil(total / params.limit!);

    const response: PaginatedResponse<any> = {
      success: true,
      data: professionals,
      message: `Profesionales de ${specialty} obtenidos exitosamente`,
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

  // Obtener profesional por ID
  public findById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const professional = await this.professionalRepository.findById(id);
    if (!professional) {
      throw createError('Profesional no encontrado', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: professional,
      message: 'Profesional obtenido exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Obtener profesional por matrícula
  public findByLicense = async (req: Request, res: Response): Promise<void> => {
    const { license } = req.params;

    const professional = await this.professionalRepository.findByLicense(license);
    if (!professional) {
      throw createError('Profesional no encontrado', 404);
    }

    const response: ApiResponse = {
      success: true,
      data: professional,
      message: 'Profesional obtenido exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Actualizar profesional
  public update = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data: UpdateProfessionalRequest = req.body;

    // Verificar si el profesional existe
    const existingProfessional = await this.professionalRepository.findById(id);
    if (!existingProfessional) {
      throw createError('Profesional no encontrado', 404);
    }

    const professional = await this.professionalRepository.update(id, data);
    if (!professional) {
      throw createError('Error al actualizar el profesional', 500);
    }

    const response: ApiResponse = {
      success: true,
      data: professional,
      message: 'Profesional actualizado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };

  // Eliminar profesional
  public delete = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    // Verificar si el profesional existe
    const existingProfessional = await this.professionalRepository.findById(id);
    if (!existingProfessional) {
      throw createError('Profesional no encontrado', 404);
    }

    const deleted = await this.professionalRepository.delete(id);
    if (!deleted) {
      throw createError('Error al eliminar el profesional', 500);
    }

    const response: ApiResponse = {
      success: true,
      message: 'Profesional eliminado exitosamente',
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  };
}
