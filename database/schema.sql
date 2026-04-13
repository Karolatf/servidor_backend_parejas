-- ============================================================
-- ARCHIVO: database/schema.sql
-- PROYECTO: servidor_backend_parejas - Sistema de Gestión de Tareas
-- AUTORES: Karol Torres, Sebastian Patiño, Paulo Pacheco
-- SENA - Técnico en Programación de Software
-- ============================================================
-- INSTRUCCIONES:
-- Este archivo lo ejecutan con la conexión app_user en Workbench.
-- Antes, ejecuten el bloque en la conexion de root es decir este bloque (SI NO LO HAN HECHO YA):

-- CREATE DATABASE IF NOT EXISTS gestion_tareas_sena;
-- CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'TORRES_2007';
-- GRANT ALL PRIVILEGES ON gestion_tareas_sena.* TO 'app_user'@'localhost';
-- FLUSH PRIVILEGES;
-- ============================================================

-- selecciona la base de datos del proyecto  (en conexion de app_user)
USE gestion_tareas_sena;

-- tabla de usuarios
-- documento UNIQUE: evita registrar la misma persona dos veces
CREATE TABLE IF NOT EXISTS users (
    id          INT          NOT NULL AUTO_INCREMENT,
    documento   VARCHAR(20)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    created_ud  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_up  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- tabla de tareas
-- assigned_users: arreglo de IDs guardado como JSON (sin FK externa)
-- comment: campo opcional para que el usuario anote observaciones sobre la tarea
CREATE TABLE IF NOT EXISTS tasks (
    id              INT          NOT NULL AUTO_INCREMENT,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    -- status: almacena el estado actual de la tarea
    -- VARCHAR(30) para soportar "pendiente_aprobacion" (22 chars)
    -- Valores validos: pendiente | en_progreso | pendiente_aprobacion | completada
    status          VARCHAR(30)  NOT NULL DEFAULT 'pendiente',
    comment         TEXT         NULL,
    assigned_users  JSON         NOT NULL DEFAULT (JSON_ARRAY()),
    created_ud      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_up      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- usuarios iniciales del equipo
-- INSERT IGNORE es idempotente: no falla si ya existen
INSERT IGNORE INTO users (documento, name, email)
VALUES ('1097497001', 'Paulo Pacheco', 'paulo@sena.edu.co');

INSERT IGNORE INTO users (documento, name, email)
VALUES ('1097497002', 'Sebastian Patiño', 'sebastian@sena.edu.co');

INSERT IGNORE INTO users (documento, name, email)
VALUES ('1097497003', 'Karol Torres', 'karol@sena.edu.co');

-- ============================================================
-- MIGRACIONES — Ejecutar solo si la BD ya existia antes
-- ============================================================
-- Ampliar status a VARCHAR(30) para pendiente_aprobacion
-- Ejecutar en MySQL Workbench con conexion app_user si ya tienes la BD creada:
-- ALTER TABLE tasks MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pendiente';