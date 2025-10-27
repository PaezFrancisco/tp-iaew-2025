// Tipos específicos para el servicio de Pacientes
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Tipos para Pacientes
export interface CreatePatientRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dni: string;
  birthDate: string;
  address?: string;
  medicalHistory?: string;
}

export interface UpdatePatientRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  medicalHistory?: string;
}

export interface PatientResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dni: string;
  birthDate: string;
  address?: string;
  medicalHistory?: string;
  createdAt: string;
  updatedAt: string;
}

// Tipos para errores
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  validationErrors?: ValidationError[];
}
