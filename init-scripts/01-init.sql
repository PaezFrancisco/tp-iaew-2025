-- ============================================
-- SCRIPT DE INICIALIZACIÓN
-- ============================================

CREATE DATABASE keycloak_db;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'keycloak_user') THEN
    CREATE USER keycloak_user WITH PASSWORD 'keycloak_password';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO keycloak_user;

\c keycloak_db

ALTER SCHEMA public OWNER TO keycloak_user;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'health_app_user') THEN
    CREATE USER health_app_user WITH PASSWORD 'health_app_password';
  END IF;
END
$$;

GRANT ALL PRIVILEGES ON DATABASE health_app_db TO health_app_user;
\c health_app_db

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO health_app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO health_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO health_app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO health_app_user;
