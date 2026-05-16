-- ============================================================
-- ARCHIVO: database/rbac.sql
-- Paso 3 — Ejecutar en Workbench con conexión app_user, DESPUÉS de schema.sql
-- Crea las tablas RBAC e inserta roles, permisos y su relación
-- ============================================================

USE gestion_tareas_sena;

-- ── TABLA: roles ─────────────────────────────────────────────
-- Un usuario puede tener múltiples roles (relación M:N via user_roles)
CREATE TABLE IF NOT EXISTS roles (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(200) NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- ── TABLA: permissions ───────────────────────────────────────
-- Permisos atómicos — nomenclatura: recurso.accion (ej: tasks.create)
CREATE TABLE IF NOT EXISTS permissions (
    id          INT          NOT NULL AUTO_INCREMENT,
    code        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(200) NULL,
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- ── TABLA: role_permissions ──────────────────────────────────
-- Pivote M:N entre roles y permisos
-- ON DELETE RESTRICT: no se puede borrar un rol o permiso con relaciones activas
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT NOT NULL,
    permission_id INT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_rp_role
        FOREIGN KEY (role_id)       REFERENCES roles (id)       ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_rp_permission
        FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ── TABLA: user_roles ────────────────────────────────────────
-- Pivote M:N entre usuarios y roles
-- ON DELETE RESTRICT: no se puede borrar un usuario o rol con asignaciones activas
CREATE TABLE IF NOT EXISTS user_roles (
    user_id    INT NOT NULL,
    role_id    INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_ur_user
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ur_role
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- ── DATOS INICIALES: roles ───────────────────────────────────
INSERT IGNORE INTO roles (name, description) VALUES
    ('admin',      'Administrador del sistema — acceso total'),
    ('user',       'Usuario estándar — gestiona sus propias tareas'),
    ('instructor', 'Docente SENA — gestiona tareas y ve usuarios sin poder eliminarlos');

-- ── DATOS INICIALES: permissions ─────────────────────────────
INSERT IGNORE INTO permissions (code, description) VALUES
    ('tasks.create',        'Crear nuevas tareas'),
    ('tasks.view.all',      'Ver todas las tareas del sistema'),
    ('tasks.update',        'Editar cualquier tarea'),
    ('tasks.delete.all',    'Eliminar cualquier tarea'),
    ('tasks.assign',        'Asignar usuarios a una tarea'),
    ('tasks.status.update', 'Cambiar el estado de una tarea propia'),
    ('users.view',          'Ver la lista de usuarios'),
    ('users.edit',          'Editar datos de cualquier usuario'),
    ('users.delete',        'Eliminar usuarios del sistema'),
    ('users.assign.role',   'Cambiar el rol de un usuario');

-- ── DATOS INICIALES: role_permissions ────────────────────────

-- admin → acceso total (todos los permisos)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'admin';

-- instructor → gestión de tareas + ver usuarios
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'instructor'
  AND p.code IN ('tasks.create','tasks.view.all','tasks.update',
                 'tasks.delete.all','tasks.assign','users.view');

-- user → solo ver y cambiar estado de sus tareas
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
  AND p.code IN ('tasks.status.update','tasks.view.all');

-- ============================================================
-- ASIGNAR ROL ADMIN A KAROL Y SEBASTIÁN
-- ============================================================
-- IMPORTANTE: ejecutar este bloque DESPUÉS de registrar a Karol y Sebastián
-- desde Postman (las contraseñas deben hashearse desde el backend, no en SQL).
--
-- PROCEDIMIENTO:
--   1. Levantar el servidor:  npm run dev
--   2. En Postman — POST http://localhost:3000/api/auth/register
--      Body Sebastián: { "name": "Sebastian Patiño",  "documento": "1005331001",
--                        "email": "sebastian@sena.edu.co", "password": "tu_contraseña*" }
--      Body Karol:     { "name": "Karol Torres",      "documento": "1097497001",
--                        "email": "karol@sena.edu.co",    "password": "tu_contraseña*" }
--   3. Ejecutar el bloque de abajo en Workbench (conexión app_user):
-- ============================================================

UPDATE users SET role = 'admin'
WHERE documento IN ('1005331001', '1097497001');

INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.documento IN ('1005331001', '1097497001')
  AND r.name = 'admin';

-- ============================================================
-- COMANDOS SQL USADOS EN ESTE ARCHIVO
-- ============================================================
-- USE bd                           → selecciona la base de datos activa
-- CREATE TABLE IF NOT EXISTS       → crea la tabla solo si no existe
-- INT / VARCHAR(n) / TIMESTAMP     → tipos de dato (entero / texto / fecha+hora)
-- NOT NULL / NULL                  → campo obligatorio / opcional
-- UNIQUE                           → no permite valores duplicados
-- AUTO_INCREMENT                   → el ID se incrementa automáticamente
-- PRIMARY KEY (col1, col2)         → clave compuesta — identifica la fila con dos columnas
-- FOREIGN KEY (col) REFERENCES     → vincula la columna a la PK de otra tabla
-- ON DELETE RESTRICT               → bloquea borrar el padre si tiene hijos relacionados
-- ON UPDATE CASCADE                → si cambia el PK del padre, la FK se actualiza sola
-- INSERT IGNORE INTO               → inserta la fila; si ya existe (clave duplicada), la ignora
-- SELECT r.id, p.id FROM r, p      → producto cartesiano filtrado con WHERE — asigna M:N
-- UPDATE tabla SET col = val       → actualiza registros existentes
--   WHERE col IN (...)             → filtra solo las filas que cumplan la condición
