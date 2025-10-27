-- ============================================
-- SCRIPT DE INICIALIZACIÓN
-- Crea la base de datos de Keycloak y configura inicial
-- ============================================

-- Crear base de datos para Keycloak
CREATE DATABASE keycloak_db;
CREATE USER keycloak_user WITH PASSWORD 'keycloak_password';
GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO keycloak_user;

-- Crear base de datos principal de la aplicación
CREATE DATABASE health_app_db;
CREATE USER health_app_user WITH PASSWORD 'health_app_password';
GRANT ALL PRIVILEGES ON DATABASE health_app_db TO health_app_user;

-- Conectar a health_app_db para crear extensiones
\c health_app_db;

-- Crear extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Otorgar permisos al usuario de la aplicación
GRANT ALL PRIVILEGES ON DATABASE health_app_db TO health_app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO health_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO health_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO health_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO health_app_user;

-- Crear índices adicionales si es necesario
-- (Prisma manejará la mayoría de los índices automáticamente)

-- ============================================
-- NOTAS
-- ============================================
-- Este script se ejecuta automáticamente cuando se inicia el contenedor PostgreSQL
-- por primera vez. Solo se ejecuta una vez.
-- 
-- Las migraciones de Prisma se ejecutarán después mediante:
-- npx prisma migrate dev

