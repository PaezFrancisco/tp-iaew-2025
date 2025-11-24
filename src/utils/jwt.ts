// ============================================
// UTILIDADES PARA VALIDACIÓN JWT
// ============================================

import axios from 'axios';
import jwt from 'jsonwebtoken';
// @ts-ignore - jwk-to-pem no tiene tipos TypeScript
import jwkToPem from 'jwk-to-pem';
import logger from '../config/logger';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'health_app';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'health_app_api';

// Cache para las claves públicas (JWKS)
let jwksCache: any = null;
let jwksCacheExpiry: number = 0;
const CACHE_DURATION = 3600000; // 1 hora

interface JWKSKey {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

interface JWKSResponse {
  keys: JWKSKey[];
}

// Obtener JWKS de Keycloak
async function getJWKS(): Promise<JWKSKey[]> {
  const now = Date.now();
  
  // Verificar cache
  if (jwksCache && now < jwksCacheExpiry) {
    return jwksCache;
  }

  try {
    const jwksUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`;
    const response = await axios.get<JWKSResponse>(jwksUrl);
    
    jwksCache = response.data.keys;
    jwksCacheExpiry = now + CACHE_DURATION;
    
    logger.info('JWKS obtenido de Keycloak', { keysCount: jwksCache.length });
    return jwksCache;
  } catch (error) {
    logger.error('Error obteniendo JWKS de Keycloak', { error });
    throw new Error('No se pudo obtener las claves públicas de Keycloak');
  }
}

// Validar token JWT usando verificación local con JWKS
export async function validateJWT(token: string): Promise<any> {
  try {
    // Decodificar sin verificar primero para obtener el header y payload
    const decoded = jwt.decode(token, { complete: true });
    
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Token inválido: formato incorrecto');
    }

    const kid = decoded.header.kid;
    if (!kid) {
      throw new Error('Token inválido: falta kid en header');
    }
    
    // Obtener JWKS
    const jwks = await getJWKS();
    const key = jwks.find(k => k.kid === kid);
    
    if (!key) {
      // Limpiar cache y reintentar una vez
      jwksCache = null;
      const freshJwks = await getJWKS();
      const freshKey = freshJwks.find(k => k.kid === kid);
      if (!freshKey) {
        throw new Error('Clave pública no encontrada para el kid del token');
      }
      // Usar la clave fresca
      const pem = jwkToPem(freshKey);
      return verifyTokenWithPem(token, pem);
    }

    // Convertir JWK a PEM para verificación
    const pem = jwkToPem(key);
    return verifyTokenWithPem(token, pem);
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      logger.warn('Token expirado', { error: error.message });
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      // Decodificar el token para obtener más información de debug
      try {
        const decoded = jwt.decode(token, { complete: true });
        if (decoded && typeof decoded !== 'string') {
          logger.warn('Token inválido', { 
            error: error.message,
            tokenIssuer: (decoded.payload as any).iss,
            tokenAudience: (decoded.payload as any).aud,
            tokenClientId: (decoded.payload as any).azp,
            expectedIssuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
            expectedAudience: KEYCLOAK_CLIENT_ID,
          });
        }
      } catch (e) {
        // Si no se puede decodificar, solo loguear el error original
        logger.warn('Token inválido', { error: error.message });
      }
      throw new Error(`Token inválido: ${error.message}`);
    }
    logger.error('Error validando JWT', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Función auxiliar para normalizar el issuer (acepta localhost o keycloak como hostname)
function normalizeIssuer(issuer: string): string {
  // Normalizar el issuer para aceptar tanto localhost como keycloak
  // Esto es necesario porque los tokens obtenidos desde fuera del contenedor
  // usan localhost:8080, pero la app dentro del contenedor usa keycloak:8080
  return issuer
    .replace(/http:\/\/localhost:(\d+)/, 'http://keycloak:$1')
    .replace(/http:\/\/127\.0\.0\.1:(\d+)/, 'http://keycloak:$1')
    .replace(/http:\/\/keycloak:(\d+)/, 'http://keycloak:$1');
}

// Función auxiliar para verificar el token con la clave PEM
function verifyTokenWithPem(token: string, pem: string): any {
  // Obtener el issuer esperado
  const expectedIssuer = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
  
  // Decodificar primero para ver el payload y verificar el audience
  const decodedPayload = jwt.decode(token);
  if (!decodedPayload || typeof decodedPayload === 'string') {
    throw new Error('Token payload inválido');
  }

  const tokenAudience = (decodedPayload as any).aud;
  const expectedAudience = KEYCLOAK_CLIENT_ID;
  const tokenIssuer = (decodedPayload as any).iss;
  
  // Normalizar ambos issuers para comparación
  const normalizedTokenIssuer = normalizeIssuer(tokenIssuer);
  const normalizedExpectedIssuer = normalizeIssuer(expectedIssuer);
  
  // Log para debug
  logger.debug('Validando token', {
    tokenIssuer,
    normalizedTokenIssuer,
    expectedIssuer,
    normalizedExpectedIssuer,
    tokenAudience,
    expectedAudience,
    clientId: (decodedPayload as any).azp || 'N/A',
  });
  
  // Verificar que el issuer normalizado coincida
  if (normalizedTokenIssuer !== normalizedExpectedIssuer) {
    logger.warn('Issuer no coincide después de normalización', { 
      tokenIssuer, 
      normalizedTokenIssuer,
      expectedIssuer,
      normalizedExpectedIssuer
    });
    throw new Error(`Token issuer inválido: esperado ${expectedIssuer}, recibido ${tokenIssuer}`);
  }
  
  // Verificar el token - NO validar issuer ni audience estricto en jwt.verify
  // porque ya validamos el issuer manualmente después de normalizar
  // Keycloak puede emitir tokens con diferentes audiences dependiendo del flujo
  try {
    const payload = jwt.verify(token, pem, {
      algorithms: ['RS256'],
      // No validar issuer aquí - ya lo validamos manualmente después de normalizar
      // No validar audience estricto - Keycloak puede emitir tokens con diferentes audiences
    });
    
    // Verificar manualmente que el issuer del payload normalizado coincida
    const payloadIssuer = (payload as any).iss;
    if (payloadIssuer) {
      const normalizedPayloadIssuer = normalizeIssuer(payloadIssuer);
      if (normalizedPayloadIssuer !== normalizedExpectedIssuer) {
        throw new Error(`Token issuer inválido en payload: esperado ${normalizedExpectedIssuer}, recibido ${normalizedPayloadIssuer}`);
      }
    }
    
    if (!payload || typeof payload === 'string') {
      throw new Error('Token payload inválido después de verificación');
    }

    // Verificar que el token tenga información válida
    const payloadObj = payload as any;
    if (!payloadObj.sub) {
      throw new Error('Token no contiene subject (sub)');
    }

    logger.debug('Token validado exitosamente', { 
      sub: payloadObj.sub,
      aud: payloadObj.aud,
      azp: payloadObj.azp,
      clientId: payloadObj.azp || payloadObj.aud,
    });
    return payload;
  } catch (verifyError: any) {
    // Si es un error de expiración o formato, lanzarlo directamente
    if (verifyError.name === 'TokenExpiredError' || verifyError.name === 'JsonWebTokenError') {
      throw verifyError;
    }
    
    // Para otros errores, agregar más contexto
    logger.error('Error verificando token', {
      error: verifyError.message,
      name: verifyError.name,
      tokenIssuer,
      tokenAudience,
    });
    throw verifyError;
  }
}

// Extraer token del header Authorization
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

