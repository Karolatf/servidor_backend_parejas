-- ============================================================
-- ARCHIVO: database/schema.sql
-- PROYECTO: servidor_backend_parejas - Sistema de Gestión de Tareas
-- AUTORES: Karol Torres y Sebastian Patiño
-- SENA: Técnico en Programación de Software
-- ============================================================
-- INSTRUCCIONES:
-- 1. Ejecutar primero el bloque de root (solo una vez, si no se ha hecho):
--
--    CREATE DATABASE IF NOT EXISTS gestion_tareas_sena;
--    CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'TORRES_2007';
--    GRANT ALL PRIVILEGES ON gestion_tareas_sena.* TO 'app_user'@'localhost';
--    FLUSH PRIVILEGES;
--
-- 2. Ejecutar este archivo completo con la conexión app_user en Workbench.
-- ============================================================

USE gestion_tareas_sena;

-- ============================================================
-- TABLA: users
--
-- documento:           número de documento único por persona
-- password:            hash bcrypt (nunca texto plano)
-- role:                'admin' | 'instructor' | 'user'
-- is_active:           1 = activo, 0 = desactivado (soft delete)
-- deactivation_reason: motivo registrado al desactivar (issue P1)
-- deactivation_date:   fecha en que se desactivÃ³ (issue P1)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id                   INT          NOT NULL AUTO_INCREMENT,
    documento            VARCHAR(20)  NOT NULL UNIQUE,
    name                 VARCHAR(100) NOT NULL,
    email                VARCHAR(100) NOT NULL,
    password             VARCHAR(255) NULL,
    role                 VARCHAR(20)  NOT NULL DEFAULT 'user',
    is_active            TINYINT(1)   NOT NULL DEFAULT 1,
    deactivation_reason  TEXT         NULL     DEFAULT NULL,
    deactivation_date    TIMESTAMP    NULL     DEFAULT NULL,
    created_ud           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_up           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);

-- ============================================================
-- TABLA: tasks
--
-- assigned_users:      arreglo JSON de IDs de usuarios asignados [1, 3, 5]
-- comment:             comentario libre del usuario sobre la tarea
-- grade:               nota numérica 0-100 asignada por el instructor (NULL = sin calificar)
-- grade_reason:        motivo de la última edición de nota (obligatorio al editar nota)
-- deleted_user_names:  mapa JSON { "userId": "nombre" } que preserva el nombre
--                      de usuarios eliminados permanentemente antes de borrarlos,
--                      para que las tareas sigan mostrando a quien estaban asignadas
-- status valores válidos:
--   pendiente | en_progreso | pendiente_aprobacion | completada | reprobada
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
    id                  INT          NOT NULL AUTO_INCREMENT,
    title               VARCHAR(200) NOT NULL,
    description         TEXT         NULL,
    status              VARCHAR(30)  NOT NULL DEFAULT 'pendiente',
    comment             TEXT         NULL,
    grade               DECIMAL(5,2) NULL     DEFAULT NULL,
    grade_reason        TEXT         NULL     DEFAULT NULL,
    assigned_users      JSON         NOT NULL DEFAULT (JSON_ARRAY()),
    deleted_user_names  JSON         NULL     DEFAULT (JSON_OBJECT()),
    created_ud          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_up          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);

-- ============================================================
-- TABLA: calendar_events
--
-- Eventos del calendario creados por el instructor o el usuario.
-- Dos tipos de evento:
--   'propio'      recordatorio personal (sin estudiante asignado)
--   'estudiante'  asignado a un estudiante; aparece en su calendario
--                  en modo solo lectura (sin botÃ³n eliminar)
--
-- instructor_id: FK al usuario que crea el evento
--                (puede ser el instructor o el propio usuario para eventos propios)
-- student_id:    FK al estudiante asignado (NULL si es evento propio)
-- task_id:       FK a la tarea relacionada (NULL si no aplica)
-- date:          fecha del evento (YYYY-MM-DD)
-- color:         hex del color visible en el calendario
--   índigo  #6366f1 evento propio del instructor o del usuario
--   celeste #0ea5e9 evento asignado a un estudiante
-- tipo:          'propio' | 'estudiante'
--
-- Reglas de eliminaciÃ³n:
--   Si se elimina el instructor - sus eventos se eliminan en cascada
--   Si se elimina el estudiante - el evento queda sin asignar (NULL)
--   Si se elimina la tarea      - el evento queda sin tarea (NULL)
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id             INT          NOT NULL AUTO_INCREMENT,
    instructor_id  INT          NOT NULL,
    student_id     INT          NULL     DEFAULT NULL,
    task_id        INT          NULL     DEFAULT NULL,
    date           DATE         NOT NULL,
    title          VARCHAR(200) NOT NULL,
    color          VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',
    tipo           VARCHAR(20)  NOT NULL DEFAULT 'propio',
    created_ud     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_up     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Buscar eventos por instructor + fecha (consulta más frecuente del panel instructor)
    INDEX idx_calendar_instructor_date (instructor_id, date),

    -- Buscar eventos por estudiante + fecha (consulta del panel usuario)
    INDEX idx_calendar_student_date (student_id, date),

    CONSTRAINT fk_calendar_instructor
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_calendar_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT fk_calendar_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- ============================================================
-- TABLA: user_notes
--
-- Notas personales del usuario (migradas de localStorage al servidor).
-- Cada nota pertenece a un único usuario y tiene texto libre y color pastel.
-- Al eliminar el usuario, sus notas se eliminan automáticamente (CASCADE).
--
-- color valores tí­picos usados por el frontend:
--   #fef3c7 amarillo pastel
--   #fce7f3 rosa pastel
--   #d1fae5 verde pastel
--   #dbeafe celeste pastel
-- ============================================================
CREATE TABLE IF NOT EXISTS user_notes (
    id         INT         NOT NULL AUTO_INCREMENT,
    user_id    INT         NOT NULL,
    texto      TEXT        NOT NULL,
    color      VARCHAR(20) NOT NULL DEFAULT '#fef3c7',
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    -- Acelera la consulta GET /api/notes (siempre filtrada por user_id)
    INDEX idx_user_notes_user (user_id),

    CONSTRAINT fk_user_notes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);