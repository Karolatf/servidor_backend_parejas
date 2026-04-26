-- ============================================================
-- ARCHIVO: database/connection.sql
-- PROYECTO: servidor_backend_parejas - Sistema de Gestión de Tareas
-- AUTORES: Karol Torres y Sebastian Patiño
-- SENA - Técnico en Programación de Software
-- ============================================================
-- INSTRUCCIONES PARA SEBASTIÁN:
-- Este archivo lo ejecutan con la conexión app_user en Workbench.
-- Antes, ejecuten el bloque en la conexion de root es decir este bloque (SI NO LO HAN HECHO YA):
-- ============================================================

CREATE DATABASE IF NOT EXISTS gestion_tareas_sena;
CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'TORRES_2007';
GRANT ALL PRIVILEGES ON gestion_tareas_sena.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;