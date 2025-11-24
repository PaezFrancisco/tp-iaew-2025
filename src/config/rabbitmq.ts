// ============================================
// CONFIGURACIÓN DE RABBITMQ
// ============================================

import amqp, { Connection, Channel } from 'amqplib';
import logger from './logger';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://health_app_user:health_app_password@localhost:5672';

let connection: Connection | null = null;
let channel: Channel | null = null;

// Nombres de colas y exchanges
export const QUEUES = {
  APPOINTMENT_CREATED: 'appointment.created',
  APPOINTMENT_CONFIRMED: 'appointment.confirmed',
  APPOINTMENT_RETRY: 'appointment.retry',
  APPOINTMENT_DLQ: 'appointment.dlq', // Dead Letter Queue
};

export const EXCHANGES = {
  APPOINTMENTS: 'appointments',
};

// Conectar a RabbitMQ
export async function connectRabbitMQ(): Promise<Channel> {
  try {
    if (channel) {
      return channel;
    }

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Declarar exchange
    await channel.assertExchange(EXCHANGES.APPOINTMENTS, 'topic', {
      durable: true,
    });

    // Declarar colas
    await channel.assertQueue(QUEUES.APPOINTMENT_CREATED, {
      durable: true,
    });

    await channel.assertQueue(QUEUES.APPOINTMENT_CONFIRMED, {
      durable: true,
    });

    // Cola de reintentos con TTL
    await channel.assertQueue(QUEUES.APPOINTMENT_RETRY, {
      durable: true,
      arguments: {
        'x-message-ttl': 60000, // 60 segundos
        'x-dead-letter-exchange': EXCHANGES.APPOINTMENTS,
        'x-dead-letter-routing-key': QUEUES.APPOINTMENT_CREATED,
      },
    });

    // Dead Letter Queue
    await channel.assertQueue(QUEUES.APPOINTMENT_DLQ, {
      durable: true,
    });

    // Bindings
    await channel.bindQueue(QUEUES.APPOINTMENT_CREATED, EXCHANGES.APPOINTMENTS, 'appointment.created');
    await channel.bindQueue(QUEUES.APPOINTMENT_CONFIRMED, EXCHANGES.APPOINTMENTS, 'appointment.confirmed');

    logger.info('Conectado a RabbitMQ', { url: RABBITMQ_URL.replace(/:[^:@]+@/, ':****@') });

    // Manejar desconexión
    connection.on('close', () => {
      logger.warn('Conexión a RabbitMQ cerrada');
      connection = null;
      channel = null;
    });

    connection.on('error', (err) => {
      logger.error('Error en conexión RabbitMQ', { error: err.message });
    });

    return channel;
  } catch (error: any) {
    logger.error('Error conectando a RabbitMQ', { error: error.message });
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
    
    return ch.publish(exchange, routingKey, messageBuffer, {
      persistent: true,
    });
  } catch (error: any) {
    logger.error('Error publicando mensaje a RabbitMQ', { error: error.message });
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
    logger.info('Conexión a RabbitMQ cerrada correctamente');
  } catch (error: any) {
    logger.error('Error cerrando conexión RabbitMQ', { error: error.message });
  }
}

