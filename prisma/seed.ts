import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de datos de prueba...');

  // Crear usuarios de prueba
  const patientUser = await prisma.user.create({
    data: {
      email: 'paciente@test.com',
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+5491123456789',
      patientProfile: {
        create: {
          dni: '12345678',
          birthDate: new Date('1990-05-15'),
          address: 'Av. Corrientes 1234, CABA',
          medicalHistory: 'Sin antecedentes médicos relevantes'
        }
      }
    }
  });

  const professionalUser = await prisma.user.create({
    data: {
      email: 'doctor@test.com',
      firstName: 'María',
      lastName: 'González',
      phone: '+5491123456790',
      professionalProfile: {
        create: {
          license: 'MP12345',
          specialty: 'Cardiología',
          experience: 10,
          consultationFee: 5000.00
        }
      }
    }
  });

  const professional2User = await prisma.user.create({
    data: {
      email: 'doctor2@test.com',
      firstName: 'Carlos',
      lastName: 'Rodríguez',
      phone: '+5491123456791',
      professionalProfile: {
        create: {
          license: 'MP67890',
          specialty: 'Pediatría',
          experience: 5,
          consultationFee: 4000.00
        }
      }
    }
  });

  console.log('✅ Usuarios creados:', {
    patient: patientUser.email,
    professional1: professionalUser.email,
    professional2: professional2User.email
  });

  // Crear horarios para los profesionales
  const professional1 = await prisma.professional.findUnique({
    where: { userId: professionalUser.id }
  });

  const professional2 = await prisma.professional.findUnique({
    where: { userId: professional2User.id }
  });

  if (professional1) {
    // Horarios para María González (Cardiología)
    await prisma.schedule.createMany({
      data: [
        {
          professionalId: professional1.id,
          dayOfWeek: 1, // Lunes
          startTime: '09:00',
          endTime: '17:00'
        },
        {
          professionalId: professional1.id,
          dayOfWeek: 2, // Martes
          startTime: '09:00',
          endTime: '17:00'
        },
        {
          professionalId: professional1.id,
          dayOfWeek: 3, // Miércoles
          startTime: '09:00',
          endTime: '17:00'
        },
        {
          professionalId: professional1.id,
          dayOfWeek: 4, // Jueves
          startTime: '09:00',
          endTime: '17:00'
        },
        {
          professionalId: professional1.id,
          dayOfWeek: 5, // Viernes
          startTime: '09:00',
          endTime: '13:00'
        }
      ]
    });
  }

  if (professional2) {
    // Horarios para Carlos Rodríguez (Pediatría)
    await prisma.schedule.createMany({
      data: [
        {
          professionalId: professional2.id,
          dayOfWeek: 1, // Lunes
          startTime: '08:00',
          endTime: '16:00'
        },
        {
          professionalId: professional2.id,
          dayOfWeek: 2, // Martes
          startTime: '08:00',
          endTime: '16:00'
        },
        {
          professionalId: professional2.id,
          dayOfWeek: 3, // Miércoles
          startTime: '08:00',
          endTime: '16:00'
        },
        {
          professionalId: professional2.id,
          dayOfWeek: 4, // Jueves
          startTime: '08:00',
          endTime: '16:00'
        },
        {
          professionalId: professional2.id,
          dayOfWeek: 5, // Viernes
          startTime: '08:00',
          endTime: '12:00'
        }
      ]
    });
  }

  console.log('✅ Horarios creados para profesionales');

  // Crear algunos turnos de ejemplo
  const patient = await prisma.patient.findUnique({
    where: { userId: patientUser.id }
  });

  if (patient && professional1) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        professionalId: professional1.id,
        date: tomorrow,
        startTime: '10:00',
        endTime: '10:30',
        status: 'PENDING',
        notes: 'Consulta de rutina'
      }
    });

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        professionalId: professional1.id,
        date: nextWeek,
        startTime: '14:00',
        endTime: '14:30',
        status: 'CONFIRMED',
        notes: 'Seguimiento de tratamiento'
      }
    });
  }

  console.log('✅ Turnos de ejemplo creados');

  console.log('🎉 Seed completado exitosamente!');
  console.log('\n📋 Datos de prueba creados:');
  console.log('👤 Paciente: paciente@test.com (DNI: 12345678)');
  console.log('👨‍⚕️ Cardiología: doctor@test.com (MP: 12345)');
  console.log('👨‍⚕️ Pediatría: doctor2@test.com (MP: 67890)');
  console.log('\n🔗 Puedes probar la API en: http://localhost:3000');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
