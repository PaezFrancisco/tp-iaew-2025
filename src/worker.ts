// ============================================
// WORKER - Procesamiento Asíncrono de Webhooks
// ============================================

import dotenv from 'dotenv';
import amqp, { Channel, ConsumeMessage } from 'amqplib';
import axios from 'axios';
import prisma from './config/database';
import { connectRabbitMQ, QUEUES, EXCHANGES, publishMessage } from './config/rabbitmq';
import { prepareWebhookPayload } from './utils/webhook';
import logger from './config/logger';

const workerLogger = logger.child({ component: 'worker' });

dotenv.config();

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://httpbin.org/post';
const MAX_RETRIES = 3;

async function processAppointmentCreated(message: ConsumeMessage | null) {
  if (!message) return;

  try {
    const data = JSON.parse(message.content.toString());
    workerLogger.info('Procesando appointment.created', {
      resource: 'appointment',
      operation: 'worker.processCreated',
      appointmentId: data.appointmentId,
    });

    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        professional: true,
        patient: true,
      },
    });

    if (!appointment) {
      workerLogger.error('Appointment no encontrado', {
        resource: 'appointment',
        operation: 'worker.processCreated',
        appointmentId: data.appointmentId,
      });
      message.channel.nack(message, false, false);
      return;
    }

    const webhookData = prepareWebhookPayload('appointment.created', {
      appointmentId: appointment.id,
      professional: {
        id: appointment.professional.id,
        name: appointment.professional.name,
        specialty: appointment.professional.specialty,
      },
      patient: {
        id: appointment.patient.id,
        name: appointment.patient.name,
        email: appointment.patient.email,
      },
      appointmentDate: appointment.appointmentDate.toISOString(),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      reason: appointment.reason,
    });

    let webhookSuccess = false;
    let webhookResponse: string | null = null;
    let attempts = appointment.webhookAttempts || 0;

    try {
      const response = await axios.post(WEBHOOK_URL, webhookData.payload, {
        headers: webhookData.headers,
        timeout: 10000,
      });

      webhookSuccess = response.status >= 200 && response.status < 300;
      webhookResponse = JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      workerLogger.info('Webhook enviado exitosamente', {
        resource: 'appointment',
        operation: 'worker.webhookSuccess',
        appointmentId: appointment.id,
        professionalId: appointment.professionalId,
        patientId: appointment.patientId,
        httpStatus: response.status,
        status: appointment.status,
      });
    } catch (error: any) {
      attempts++;
      webhookResponse = JSON.stringify({
        error: error.message,
        code: error.code,
      });

      workerLogger.warn('Error enviando webhook', {
        resource: 'appointment',
        operation: 'worker.webhookError',
        appointmentId: appointment.id,
        professionalId: appointment.professionalId,
        patientId: appointment.patientId,
        attempt: attempts,
        error: error.message,
      });

      if (attempts < MAX_RETRIES) {
        await publishMessage(EXCHANGES.APPOINTMENTS, 'appointment.retry', {
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          attempt: attempts,
          timestamp: new Date().toISOString(),
        });
        workerLogger.info('Mensaje enviado a cola de reintentos', {
          resource: 'appointment',
          operation: 'worker.retryScheduled',
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          attempt: attempts,
        });
      } else {
        // Enviar a Dead Letter Queue
        await publishMessage(EXCHANGES.APPOINTMENTS, 'appointment.dlq', {
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          attempts: attempts,
          timestamp: new Date().toISOString(),
        });
        workerLogger.error('Mensaje enviado a DLQ después de máximo de reintentos', {
          resource: 'appointment',
          operation: 'worker.sentToDLQ',
          appointmentId: appointment.id,
          professionalId: appointment.professionalId,
          patientId: appointment.patientId,
          attempts,
        });
      }
    }

    // Actualizar estado del appointment
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        webhookSent: webhookSuccess,
        webhookAttempts: attempts,
        webhookResponse,
        lastWebhookAt: new Date(),
        // Si el webhook fue exitoso, confirmar el appointment
        status: webhookSuccess ? 'CONFIRMED' : appointment.status,
      },
    });

    workerLogger.info('Estado de appointment actualizado tras webhook', {
      resource: 'appointment',
      operation: 'worker.updateStatusAfterWebhook',
      appointmentId: appointment.id,
      professionalId: appointment.professionalId,
      patientId: appointment.patientId,
      status: webhookSuccess ? 'CONFIRMED' : appointment.status,
      webhookSent: webhookSuccess,
      attempts,
    });

    // Confirmar mensaje procesado
    message.channel.ack(message);
  } catch (error: any) {
    workerLogger.error('Error procesando mensaje appointment.created', {
      resource: 'appointment',
      operation: 'worker.processCreated',
      error: error.message,
      stack: error.stack,
    });
    // Rechazar y reintentar
    message.channel.nack(message, false, true);
  }
}

// Procesar mensaje de reintento
async function processAppointmentRetry(message: ConsumeMessage | null) {
  if (!message) return;

  try {
    const data = JSON.parse(message.content.toString());
    workerLogger.info('Procesando reintento de appointment', {
      resource: 'appointment',
      operation: 'worker.processRetry',
      appointmentId: data.appointmentId,
    });

    // Reintentar procesamiento
    await processAppointmentCreated(message);
  } catch (error: any) {
    workerLogger.error('Error procesando reintento', { error: error.message });
    message.channel.nack(message, false, true);
  }
}

// Inicializar worker
async function startWorker() {
  try {
    workerLogger.info('Iniciando Worker de Webhooks...');

    // Conectar a RabbitMQ
    const channel = await connectRabbitMQ();

    // Consumir cola de appointments creados
    await channel.consume(
      QUEUES.APPOINTMENT_CREATED,
      processAppointmentCreated,
      { noAck: false }
    );
    workerLogger.info('Consumiendo cola: appointment.created');

    // Consumir cola de reintentos
    await channel.consume(
      QUEUES.APPOINTMENT_RETRY,
      processAppointmentRetry,
      { noAck: false }
    );
    workerLogger.info('Consumiendo cola: appointment.retry');

    workerLogger.info('Worker iniciado correctamente', {
      webhookUrl: WEBHOOK_URL,
      maxRetries: MAX_RETRIES,
    });

    // Manejar cierre graceful
    process.on('SIGTERM', async () => {
      workerLogger.info('Cerrando worker...');
      await channel.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      workerLogger.info('Cerrando worker...');
      await channel.close();
      process.exit(0);
    });
  } catch (error: any) {
    workerLogger.error('Error iniciando worker', { error: error.message });
    process.exit(1);
  }
}

// Iniciar worker
startWorker();

