-- ============================================================
-- ARCHIVO: database/schema.sql
-- Paso 2 — Ejecutar en Workbench con conexión app_user
-- Crea las tablas principales del sistema
-- ============================================================

USE gestion_tareas_sena;

-- ── TABLA: users ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id                   INT          NOT NULL AUTO_INCREMENT,
    documento            VARCHAR(20)  NOT NULL UNIQUE,
    name                 VARCHAR(100) NOT NULL,
    email                VARCHAR(100) NOT NULL,
    password             VARCHAR(255) NULL,
    role                 VARCHAR(20)  NOT NULL DEFAULT 'user',
    is_active            TINYINT(1)   NOT NULL DEFAULT 1,  -- 1=activo, 0=desactivado
    deactivation_reason  TEXT         NULL     DEFAULT NULL,
    deactivation_date    TIMESTAMP    NULL     DEFAULT NULL,
    created_ud           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_up           TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);

-- ── TABLA: tasks ─────────────────────────────────────────────
-- assigned_users: arreglo JSON de IDs  [1, 3, 5]
-- deleted_user_names: mapa JSON { "id": "nombre" } — preserva nombre de usuarios eliminados
-- status: pendiente | en_progreso | pendiente_aprobacion | completada | reprobada
-- grade: nota 0-100 asignada por el instructor (NULL = sin calificar)
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

-- ── TABLA: calendar_events ───────────────────────────────────
-- tipo: 'propio' (recordatorio personal) | 'estudiante' (visible al aprendiz)
-- Si se elimina el instructor → sus eventos se eliminan en cascada
-- Si se elimina el estudiante o la tarea → FK queda en NULL
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

    INDEX idx_calendar_instructor_date (instructor_id, date),
    INDEX idx_calendar_student_date    (student_id, date),

    CONSTRAINT fk_calendar_instructor
        FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT fk_calendar_student
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT fk_calendar_task
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- ── TABLA: user_notes ────────────────────────────────────────
-- Notas personales del aprendiz — al eliminar el usuario sus notas se borran en cascada
CREATE TABLE IF NOT EXISTS user_notes (
    id         INT         NOT NULL AUTO_INCREMENT,
    user_id    INT         NOT NULL,
    texto      TEXT        NOT NULL,
    color      VARCHAR(20) NOT NULL DEFAULT '#fef3c7',
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_user_notes_user (user_id),

    CONSTRAINT fk_user_notes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- COMANDOS SQL USADOS EN ESTE ARCHIVO
-- ============================================================
-- USE bd                           → selecciona la base de datos activa
-- CREATE TABLE IF NOT EXISTS       → crea la tabla solo si no existe
-- INT                              → número entero (IDs, flags)
-- VARCHAR(n)                       → texto de longitud máxima n (nombres, roles, colores)
-- TEXT                             → texto largo sin límite fijo (descripciones, contraseñas hash)
-- DECIMAL(5,2)                     → número con decimales — aquí para la nota (0.00 a 999.99)
-- TINYINT(1)                       → entero pequeño usado como booleano (0/1)
-- TIMESTAMP                        → fecha + hora; se usa para created_at / updated_at
-- DATE                             → solo fecha sin hora (eventos del calendario)
-- JSON                             → columna JSON nativa de MySQL (arreglos e objetos)
-- NOT NULL                         → el campo es obligatorio
-- NULL                             → el campo es opcional
-- DEFAULT valor                    → valor que toma la columna si no se especifica
-- DEFAULT CURRENT_TIMESTAMP        → fecha/hora del servidor al insertar
-- ON UPDATE CURRENT_TIMESTAMP      → se actualiza automáticamente al modificar la fila
-- UNIQUE                           → no permite valores duplicados en esa columna
-- AUTO_INCREMENT                   → el ID se incrementa solo con cada nuevo registro
-- PRIMARY KEY (col)                → identificador único de cada fila
-- INDEX nombre (col1, col2)        → índice que acelera búsquedas por esas columnas
-- FOREIGN KEY (col) REFERENCES     → vincula esta columna a la PK de otra tabla
-- ON DELETE CASCADE                → al borrar el padre, los hijos se borran también
-- ON DELETE SET NULL               → al borrar el padre, la FK queda en NULL
