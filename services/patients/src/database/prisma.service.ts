import { PrismaClient } from '@prisma/client';

// Cliente de Prisma singleton para el servicio de pacientes
class PrismaService {
  private static instance: PrismaService;
  public prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });
  }

  public static getInstance(): PrismaService {
    if (!PrismaService.instance) {
      PrismaService.instance = new PrismaService();
    }
    return PrismaService.instance;
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ [PATIENTS-SERVICE] Conectado a la base de datos PostgreSQL');
    } catch (error) {
      console.error('❌ [PATIENTS-SERVICE] Error conectando a la base de datos:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      console.log('🔌 [PATIENTS-SERVICE] Desconectado de la base de datos');
    } catch (error) {
      console.error('❌ [PATIENTS-SERVICE] Error desconectando de la base de datos:', error);
      throw error;
    }
  }

  // Método para verificar la conexión
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ [PATIENTS-SERVICE] Health check de base de datos falló:', error);
      return false;
    }
  }
}

// Exportar instancia singleton
export const prismaService = PrismaService.getInstance();
export const prisma = prismaService.prisma;

// Manejo de cierre graceful
process.on('beforeExit', async () => {
  await prismaService.disconnect();
});

process.on('SIGINT', async () => {
  await prismaService.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prismaService.disconnect();
  process.exit(0);
});

