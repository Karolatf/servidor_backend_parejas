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
-- ORDEN DE EJECUCIÓN COMPLETO (reimportar BD desde cero)
--   1. connection.sql  → (este archivo) crear BD y usuario    — conexión ROOT
--   2. schema.sql      → crear todas las tablas               — conexión app_user
--   3. seed.sql        → insertar roles, permisos y sus       — conexión app_user
--                        relaciones (RBAC completo)
--
-- Después de ejecutar seed.sql:
--   4. Registrar a Karol y Sebastián desde el navegador
--   5. Ejecutar el bloque PASO 4 de seed.sql para promoverlos a admin
-- ============================================================
