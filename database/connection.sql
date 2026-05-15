-- ============================================================
-- ARCHIVO: database/connection.sql
-- Paso 1 — Ejecutar en Workbench con conexión ROOT (una sola vez)
-- Crea la base de datos y el usuario de la aplicación
-- ============================================================

CREATE DATABASE IF NOT EXISTS gestion_tareas_sena;
CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'TORRES_2007';
GRANT ALL PRIVILEGES ON gestion_tareas_sena.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;

-- ============================================================
-- ORDEN DE EJECUCIÓN COMPLETO
--   1. connection.sql  → (este archivo) crear BD y usuario
--   2. schema.sql      → crear tablas principales
--   3. rbac.sql        → crear tablas RBAC + datos iniciales
-- ============================================================

-- ============================================================
-- COMANDOS SQL USADOS EN ESTE ARCHIVO
-- ============================================================
-- CREATE DATABASE IF NOT EXISTS  → crea la BD solo si no existe
-- CREATE USER IF NOT EXISTS      → crea el usuario solo si no existe
--   IDENTIFIED BY 'contraseña'   → asigna la contraseña del usuario
-- GRANT ALL PRIVILEGES ON bd.*   → da acceso total a esa BD al usuario
--   TO 'user'@'localhost'        → especifica a quién se le otorga
-- FLUSH PRIVILEGES               → aplica los cambios de permisos de inmediato
