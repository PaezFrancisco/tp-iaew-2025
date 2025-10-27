// Tipos base para la API
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

// Tipos para Profesionales
export interface CreateProfessionalRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  license: string;
  specialty: string;
  experience?: number;
  consultationFee: number;
}

export interface UpdateProfessionalRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialty?: string;
  experience?: number;
  consultationFee?: number;
}

export interface ProfessionalResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  license: string;
  specialty: string;
  experience: number;
  consultationFee: number;
  createdAt: string;
  updatedAt: string;
}

// Tipos para Horarios
export interface CreateScheduleRequest {
  professionalId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
}

export interface UpdateScheduleRequest {
  startTime?: string;
  endTime?: string;
  isActive?: boolean;
}

export interface ScheduleResponse {
  id: string;
  professionalId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Tipos para Turnos/Citas
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface CreateAppointmentRequest {
  patientId: string;
  professionalId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  notes?: string;
}

export interface UpdateAppointmentRequest {
  date?: string;
  startTime?: string;
  endTime?: string;
  status?: AppointmentStatus;
  notes?: string;
}

export interface AppointmentResponse {
  id: string;
  patientId: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Información relacionada
  patient?: {
    firstName: string;
    lastName: string;
    dni: string;
  };
  professional?: {
    firstName: string;
    lastName: string;
    specialty: string;
    license: string;
  };
}

// Tipos para consultas de disponibilidad
export interface AvailabilityRequest {
  professionalId: string;
  date: string; // YYYY-MM-DD
}

export interface TimeSlot {
  time: string; // HH:MM
  available: boolean;
}

export interface AvailabilityResponse {
  professionalId: string;
  date: string;
  timeSlots: TimeSlot[];
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
