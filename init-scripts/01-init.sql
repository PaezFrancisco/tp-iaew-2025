-- ============================================
-- SCRIPT DE INICIALIZACIÓN
-- Crea la base de datos de Keycloak y configura inicial
-- ============================================

-- Crear base de datos para Keycloak
CREATE DATABASE keycloak_db;

-- Crear usuario para Keycloak
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'keycloak_user') THEN
    CREATE USER keycloak_user WITH PASSWORD 'keycloak_password';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO keycloak_user;

-- Conectar a keycloak_db para otorgar permisos en el schema
\c keycloak_db

-- Hacer que keycloak_user sea el dueño del schema public (necesario para Keycloak)
ALTER SCHEMA public OWNER TO keycloak_user;

-- Crear base de datos principal de la aplicación (ya existe por POSTGRES_DB, pero por si acaso)
-- CREATE DATABASE health_app_db; -- Ya se crea automáticamente por POSTGRES_DB

-- Crear usuario para la aplicación
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'health_app_user') THEN
    CREATE USER health_app_user WITH PASSWORD 'health_app_password';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE health_app_db TO health_app_user;

-- Crear extensiones en health_app_db
-- Conectarse a health_app_db usando psql desde el script
\c health_app_db

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Otorgar permisos adicionales
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO health_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO health_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO health_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO health_app_user;
