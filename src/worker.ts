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

dotenv.config();

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://httpbin.org/post';
const MAX_RETRIES = 3;

// Procesar mensaje de appointment creado
async function processAppointmentCreated(message: ConsumeMessage | null) {
  if (!message) return;

  try {
    const data = JSON.parse(message.content.toString());
    logger.info('Procesando appointment.created', { appointmentId: data.appointmentId });

    // Obtener detalles del appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: {
        professional: true,
        patient: true,
      },
    });

    if (!appointment) {
      logger.error('Appointment no encontrado', { appointmentId: data.appointmentId });
      message.channel.nack(message, false, false); // Rechazar y no reintentar
      return;
    }

    // Preparar payload del webhook
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

    // Enviar webhook
    let webhookSuccess = false;
    let webhookResponse: string | null = null;
    let attempts = appointment.webhookAttempts || 0;

    try {
      const response = await axios.post(WEBHOOK_URL, webhookData.payload, {
        headers: webhookData.headers,
        timeout: 10000, // 10 segundos
      });

      webhookSuccess = response.status >= 200 && response.status < 300;
      webhookResponse = JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        data: response.data,
      });

      logger.info('Webhook enviado exitosamente', {
        appointmentId: appointment.id,
        status: response.status,
      });
    } catch (error: any) {
      attempts++;
      webhookResponse = JSON.stringify({
        error: error.message,
        code: error.code,
      });

      logger.warn('Error enviando webhook', {
        appointmentId: appointment.id,
        attempt: attempts,
        error: error.message,
      });

      // Si no se ha alcanzado el máximo de reintentos, enviar a cola de reintentos
      if (attempts < MAX_RETRIES) {
        await publishMessage(
          EXCHANGES.APPOINTMENTS,
          'appointment.retry',
          {
            appointmentId: appointment.id,
            attempt: attempts,
            timestamp: new Date().toISOString(),
          }
        );
        logger.info('Mensaje enviado a cola de reintentos', {
          appointmentId: appointment.id,
          attempt: attempts,
        });
      } else {
        // Enviar a Dead Letter Queue
        await publishMessage(
          EXCHANGES.APPOINTMENTS,
          'appointment.dlq',
          {
            appointmentId: appointment.id,
            attempts: attempts,
            timestamp: new Date().toISOString(),
          }
        );
        logger.error('Mensaje enviado a DLQ después de máximo de reintentos', {
          appointmentId: appointment.id,
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

    // Confirmar mensaje procesado
    message.channel.ack(message);
  } catch (error: any) {
    logger.error('Error procesando mensaje appointment.created', {
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
    logger.info('Procesando reintento de appointment', { appointmentId: data.appointmentId });

    // Reintentar procesamiento
    await processAppointmentCreated(message);
  } catch (error: any) {
    logger.error('Error procesando reintento', { error: error.message });
    message.channel.nack(message, false, true);
  }
}

// Inicializar worker
async function startWorker() {
  try {
    logger.info('Iniciando Worker de Webhooks...');

    // Conectar a RabbitMQ
    const channel = await connectRabbitMQ();

    // Consumir cola de appointments creados
    await channel.consume(
      QUEUES.APPOINTMENT_CREATED,
      processAppointmentCreated,
      { noAck: false }
    );
    logger.info('Consumiendo cola: appointment.created');

    // Consumir cola de reintentos
    await channel.consume(
      QUEUES.APPOINTMENT_RETRY,
      processAppointmentRetry,
      { noAck: false }
    );
    logger.info('Consumiendo cola: appointment.retry');

    logger.info('Worker iniciado correctamente', {
      webhookUrl: WEBHOOK_URL,
      maxRetries: MAX_RETRIES,
    });

    // Manejar cierre graceful
    process.on('SIGTERM', async () => {
      logger.info('Cerrando worker...');
      await channel.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Cerrando worker...');
      await channel.close();
      process.exit(0);
    });
  } catch (error: any) {
    logger.error('Error iniciando worker', { error: error.message });
    process.exit(1);
  }
}

// Iniciar worker
startWorker();

