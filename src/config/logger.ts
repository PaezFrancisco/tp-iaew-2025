// ============================================
// CONFIGURACIÓN DE LOGGING ESTRUCTURADO
// ============================================

import winston from 'winston';
import { Client } from '@elastic/elasticsearch';

const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const elasticsearchClient = new Client({ node: elasticsearchUrl });

// Transporte para Elasticsearch
const elasticsearchTransport = new winston.transports.Http({
  host: elasticsearchUrl.replace('http://', '').replace('https://', ''),
  port: elasticsearchUrl.includes('https') ? 443 : 9200,
  path: '/_bulk',
  ssl: elasticsearchUrl.includes('https'),
});

// Formato de logs estructurados
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Logger principal
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'health-appointments-api' },
  transports: [
    // Console para desarrollo
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
        })
      ),
    }),
  ],
});

// En producción, agregar transporte a Elasticsearch
if (process.env.NODE_ENV === 'production') {
  logger.add(elasticsearchTransport);
}

// Función helper para enviar logs a Elasticsearch manualmente
export async function sendLogToElasticsearch(logData: any) {
  try {
    await elasticsearchClient.index({
      index: 'health-appointments-logs',
      body: {
        '@timestamp': new Date().toISOString(),
        ...logData,
      },
    });
  } catch (error) {
    console.error('Error enviando log a Elasticsearch:', error);
  }
}

export default logger;

