// ============================================
// CONFIGURACIÓN DE LOGGING ESTRUCTURADO
// ============================================

import winston from 'winston';
import { Client } from '@elastic/elasticsearch';

const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const elasticsearchClient = new Client({ node: elasticsearchUrl });

let elasticsearchTransport: winston.transports.Http | null = null;

try {
  const url = new URL(elasticsearchUrl);

  elasticsearchTransport = new winston.transports.Http({
    host: url.hostname,
    port: Number(url.port) || (url.protocol === 'https:' ? 443 : 9200),
    path: '/health-appointments-logs/_doc',
    ssl: url.protocol === 'https:',
  });
} catch (error) {
  console.error('Error configurando transporte de Elasticsearch:', error);
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format((info: winston.Logform.TransformableInfo) => {
    if (!info['@timestamp']) {
      info['@timestamp'] = info.timestamp;
    }

    if (!info.origin && info.component) {
      info.origin = info.component;
    }
    if (!info.origin) {
      info.origin = 'api';
    }

    return info;
  })(),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: {
    service: 'health-appointments-api',
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ timestamp, level, message, ...meta }: winston.Logform.TransformableInfo) => {
            return `${timestamp} [${level}]: ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          }
        )
      ),
    }),
  ],
});

if (elasticsearchTransport) {
  logger.add(elasticsearchTransport);
}

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

