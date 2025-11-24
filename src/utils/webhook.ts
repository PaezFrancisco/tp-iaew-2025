// ============================================
// UTILIDADES PARA WEBHOOKS
// ============================================

import crypto from 'crypto';
import logger from '../config/logger';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-webhook-secret-change-in-production';

// Generar firma HMAC para webhook
export function generateWebhookSignature(payload: any): string {
  const payloadString = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payloadString)
    .digest('hex');
  
  return signature;
}

// Verificar firma de webhook
export function verifyWebhookSignature(payload: any, signature: string): boolean {
  const expectedSignature = generateWebhookSignature(payload);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Preparar payload de webhook
export function prepareWebhookPayload(event: string, data: any) {
  const payload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const signature = generateWebhookSignature(payload);

  return {
    payload,
    signature,
    headers: {
      'X-Webhook-Signature': signature,
      'X-Webhook-Event': event,
      'Content-Type': 'application/json',
    },
  };
}

logger.info('Webhook utilities inicializadas', { secretConfigured: !!WEBHOOK_SECRET });

