// ============================================
// CONFIGURACIÓN DE RABBITMQ
// ============================================

import amqp, { Connection, Channel } from 'amqplib';
import logger from './logger';

const rabbitLogger = logger.child({ component: 'rabbitmq' });

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://health_app_user:health_app_password@localhost:5672';

let connection: Connection | null = null;
let channel: Channel | null = null;

export const QUEUES = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_RETRY: 'appointment.retry',
  APPOINTMENT_DLQ: 'appointment.dlq', // Dead Letter Queue
};

export const EXCHANGES = {
  APPOINTMENTS: 'appointments',
};

export async function connectRabbitMQ(): Promise<Channel> {
  try {
    if (channel) {
      return channel;
    }

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGES.APPOINTMENTS, 'topic', {
      durable: true,
    });

    await channel.assertQueue(QUEUES.APPOINTMENT_CREATED, {
      durable: true,
    });

    await channel.assertQueue(QUEUES.APPOINTMENT_CONFIRMED, {
      durable: true,
    });

    await channel.assertQueue(QUEUES.APPOINTMENT_RETRY, {
      durable: true,
      arguments: {
        'x-message-ttl': 60000, // 60 segundos
        'x-dead-letter-exchange': EXCHANGES.APPOINTMENTS,
        'x-dead-letter-routing-key': QUEUES.APPOINTMENT_CREATED,
      },
    });

    await channel.assertQueue(QUEUES.APPOINTMENT_DLQ, {
      durable: true,
    });

    await channel.bindQueue(QUEUES.APPOINTMENT_CREATED, EXCHANGES.APPOINTMENTS, 'appointment.created');
    await channel.bindQueue(QUEUES.APPOINTMENT_CONFIRMED, EXCHANGES.APPOINTMENTS, 'appointment.confirmed');

    rabbitLogger.info('Conectado a RabbitMQ', { url: RABBITMQ_URL.replace(/:[^:@]+@/, ':****@') });

    connection.on('close', () => {
      rabbitLogger.warn('Conexión a RabbitMQ cerrada');
      connection = null;
      channel = null;
    });

    connection.on('error', (err) => {
      rabbitLogger.error('Error en conexión RabbitMQ', { error: err.message });
    });

    return channel;
  } catch (error: any) {
    rabbitLogger.error('Error conectando a RabbitMQ', { error: error.message });
    throw error;
  }
}

// Publicar mensaje
export async function publishMessage(
  exchange: string,
  routingKey: string,
  message: any
): Promise<boolean> {
  try {
    const ch = await connectRabbitMQ();
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const published = ch.publish(exchange, routingKey, messageBuffer, {
      persistent: true,
    });
    rabbitLogger.info('Mensaje publicado en RabbitMQ', {
      exchange,
      routingKey,
      message,
    });
    return published;
  } catch (error: any) {
    rabbitLogger.error('Error publicando mensaje a RabbitMQ', { error: error.message });
    throw error;
  }
}

// Cerrar conexión
export async function closeRabbitMQ() {
  try {
    if (channel) {
      await channel.close();
    }
    if (connection) {
      await connection.close();
    }
    rabbitLogger.info('Conexión a RabbitMQ cerrada correctamente');
  } catch (error: any) {
    rabbitLogger.error('Error cerrando conexión RabbitMQ', { error: error.message });
  }
}

