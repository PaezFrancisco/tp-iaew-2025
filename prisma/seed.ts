// ============================================
// SEED DATA - Datos iniciales para desarrollo
// ============================================

import { PrismaClient, AppointmentStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos...\n');

  // ============================================
  // Limpiar datos existentes
  // ============================================
  console.log('🧹 Limpiando datos existentes...');
  await prisma.appointment.deleteMany();
  await prisma.scheduleSlot.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.patient.deleteMany();
  console.log('✅ Datos limpiados\n');

  // ============================================
  // CREAR PACIENTES
  // ============================================
  console.log('👥 Creando pacientes...');
  const patient1 = await prisma.patient.create({
    data: {
      name: 'Juan Pérez',
      email: 'juan.perez@example.com',
      phone: '+54 11 1234-5678',
      dateOfBirth: new Date('1985-03-20'),
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: 'María García',
      email: 'maria.garcia@example.com',
      phone: '+54 11 2345-6789',
      dateOfBirth: new Date('1990-05-15'),
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      name: 'Carlos Rodríguez',
      email: 'carlos.rodriguez@example.com',
      phone: '+54 11 3456-7890',
      dateOfBirth: new Date('1988-09-10'),
    },
  });
  console.log(`✅ ${3} pacientes creados\n`);

  // ============================================
  // CREAR PROFESIONALES
  // ============================================
  console.log('👨‍⚕️ Creando profesionales médicos...');
  const professional1 = await prisma.professional.create({
    data: {
      name: 'Dr. Roberto Silva',
      email: 'roberto.silva@example.com',
      phone: '+54 11 4567-8901',
      specialty: 'Medicina General',
      licenseNumber: 'MG-12345',
    },
  });

  const professional2 = await prisma.professional.create({
    data: {
      name: 'Dra. Ana Martínez',
      email: 'ana.martinez@example.com',
      phone: '+54 11 5678-9012',
      specialty: 'Cardiología',
      licenseNumber: 'CARD-67890',
    },
  });

  const professional3 = await prisma.professional.create({
    data: {
      name: 'Dr. Pablo Fernández',
      email: 'pablo.fernandez@example.com',
      phone: '+54 11 6789-0123',
      specialty: 'Pediatría',
      licenseNumber: 'PED-54321',
    },
  });
  console.log(`✅ ${3} profesionales creados\n`);

  // ============================================
  // CREAR HORARIOS DISPONIBLES
  // ============================================
  console.log('📅 Creando horarios disponibles...');
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalizar a medianoche
  
  // Crear horarios desde mañana hasta 30 días adelante
  const slots = [];
  const professionals = [professional1.id, professional2.id, professional3.id];
  
  professionals.forEach(professionalId => {
    // Crear slots para los próximos 30 días
    for (let day = 1; day <= 30; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);
      
      // Saltar fines de semana
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      // Crear slots cada 30 minutos de 9:00 a 17:00
      for (let hour = 9; hour < 17; hour++) {
        for (const minutes of [0, 30]) {
          const startTime = `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          const endHour = minutes === 30 ? hour + 1 : hour;
          const endMinutes = minutes === 30 ? 0 : 30;
          const endTime = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
          
          slots.push({
            professionalId,
            date,
            startTime,
            endTime,
            isAvailable: true,
            isBlocked: false,
          });
        }
      }
    }
  });
  
  await prisma.scheduleSlot.createMany({
    data: slots,
  });
  console.log(`✅ ${slots.length} horarios creados\n`);
  
  // Calcular fecha de ejemplo para el appointment (mañana a las 10:00)
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  // Si mañana es fin de semana, usar el próximo lunes
  while (tomorrow.getDay() === 0 || tomorrow.getDay() === 6) {
    tomorrow.setDate(tomorrow.getDate() + 1);
  }
  
  console.log('📝 Fecha de ejemplo para appointments:');
  console.log(`   Fecha: ${tomorrow.toISOString().split('T')[0]}`);
  console.log(`   Horario recomendado: 10:00 - 10:30\n`);

  // ============================================
  // CREAR TURNOS DE EJEMPLO
  // ============================================
  console.log('🗓️ Creando turnos de ejemplo...');
  
  // Turno confirmado
  const appointment1 = await prisma.appointment.create({
    data: {
      professionalId: professional1.id,
      patientId: patient1.id,
      appointmentDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
      startTime: '10:00',
      endTime: '10:30',
      status: AppointmentStatus.CONFIRMED,
      reason: 'Consulta médica de rutina',
      webhookSent: true,
      webhookAttempts: 1,
      lastWebhookAt: new Date(),
    },
  });

  // Turno pendiente
  const appointment2 = await prisma.appointment.create({
    data: {
      professionalId: professional2.id,
      patientId: patient2.id,
      appointmentDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7),
      startTime: '14:00',
      endTime: '14:30',
      status: AppointmentStatus.PENDING,
      reason: 'Control cardiológico',
      webhookSent: false,
      webhookAttempts: 0,
    },
  });

  // Turno completado
  const appointment3 = await prisma.appointment.create({
    data: {
      professionalId: professional3.id,
      patientId: patient3.id,
      appointmentDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2),
      startTime: '11:00',
      endTime: '11:30',
      status: AppointmentStatus.COMPLETED,
      reason: 'Vacunación infantil',
      webhookSent: true,
      webhookAttempts: 1,
      lastWebhookAt: new Date(),
    },
  });
  
  console.log(`✅ ${3} turnos de ejemplo creados\n`);

  // ============================================
  // RESUMEN
  // ============================================
  console.log('✨ Seed completado exitosamente!\n');
  console.log('📊 Resumen de datos creados:');
  console.log(`   - Pacientes: ${3}`);
  console.log(`   - Profesionales: ${3}`);
  console.log(`   - Horarios disponibles: ${slots.length}`);
  console.log(`   - Turnos de ejemplo: ${3}\n`);
  
  console.log('👤 Credenciales de ejemplo:');
  console.log('   Paciente: juan.perez@example.com');
  console.log('   Profesional: roberto.silva@example.com\n');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

