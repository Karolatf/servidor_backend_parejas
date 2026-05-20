-- ============================================================
-- ARCHIVO: database/seed.sql
-- Paso 3 -- Ejecutar DESPUES de schema.sql con conexion app_user
-- Inserta los datos iniciales: roles, permisos y sus relaciones (RBAC completo)
-- ============================================================

USE gestion_tareas_sena;

-- ROLES DEL SISTEMA
-- Roles base: cada uno tiene una vista SPA propia e independiente
-- Roles adicionales: se pueden combinar con un rol base para ampliar permisos
--   y hacer aparecer secciones extra en el sidebar del usuario
INSERT INTO roles (name, label, color, descripcion) VALUES
    ('admin',       'Administrador',        '#0ea5e9', 'Gestiona usuarios, roles y configuracion del sistema'),
    ('instructor',  'Instructor / Docente', '#10b981', 'Crea y califica tareas, gestiona el calendario de estudiantes'),
    ('user',        'Estudiante',           '#8b5cf6', 'Visualiza sus tareas asignadas, notas personales y calendario'),
    ('auditor',     'Auditor',              '#fb923c', 'Solo lectura: ve tareas, usuarios, actividad y reportes sin modificar nada'),
    ('comunicador', 'Comunicador',          '#84cc16', 'Crea y gestiona anuncios del sistema y envia notificaciones personalizadas'),
    ('soporte',     'Soporte',              '#f87171', 'Accede a logs tecnicos y actividad del sistema para brindar soporte');

-- PERMISOS DEL SISTEMA
-- El `code` es la clave que los middlewares y el frontend usan para verificar acceso
INSERT INTO permissions (code, descripcion) VALUES
    -- Tareas
    ('tasks.create',          'Crear nuevas tareas en el sistema'),
    ('tasks.view.all',        'Ver todas las tareas sin importar a quien esten asignadas'),
    ('tasks.view.own',        'Ver solo las tareas asignadas al propio usuario'),
    ('tasks.update',          'Editar tareas existentes'),
    ('tasks.update.ungraded', 'Editar tareas que aun no han sido calificadas'),
    ('tasks.delete.all',      'Eliminar cualquier tarea del sistema'),
    ('tasks.assign',          'Asignar y desasignar usuarios en tareas'),
    ('tasks.grade',           'Asignar nota y comentario de calificacion a una tarea'),
    ('tasks.status.update',   'Cambiar el estado de una tarea'),
    ('tasks.comment',         'Agregar comentarios a tareas calificadas'),
    -- Usuarios
    ('users.view',            'Ver la lista de usuarios registrados en el sistema'),
    ('users.create',          'Crear nuevos usuarios desde el panel de administracion'),
    ('users.edit',            'Editar los datos de un usuario (documento, nombre, correo)'),
    ('users.delete',          'Eliminar usuarios del sistema (estandar o forzoso)'),
    ('users.assign.role',     'Asignar y gestionar los roles de un usuario'),
    ('users.deactivate',      'Desactivar o reactivar cuentas de usuario'),
    -- Calendario y notas
    ('calendar.create',       'Crear eventos propios en el calendario'),
    ('calendar.assign',       'Asignar eventos del calendario a estudiantes especificos'),
    ('notes.create',          'Crear y gestionar notas personales tipo post-it'),
    ('notes.view.own',        'Ver las notas personales propias'),
    -- PERMISOS EXCLUSIVOS DEL ROL AUDITOR (3 unicos)
    -- El prefijo auditor.* garantiza que no colisionen con otros roles
    ('auditor.tareas',        'Auditor: ver todas las tareas del sistema en modo solo lectura'),
    ('auditor.usuarios',      'Auditor: ver todos los usuarios del sistema en modo solo lectura'),
    ('auditor.reportes',      'Auditor: ver reportes, metricas y estadisticas del sistema'),
    -- PERMISOS EXCLUSIVOS DEL ROL COMUNICADOR (3 unicos)
    ('comunicador.anuncios',       'Comunicador: crear y gestionar anuncios para todos los usuarios'),
    ('comunicador.notificaciones', 'Comunicador: enviar notificaciones personalizadas a grupos'),
    ('comunicador.historial',      'Comunicador: ver historial completo de comunicaciones enviadas'),
    -- PERMISOS EXCLUSIVOS DEL ROL SOPORTE (3 unicos)
    ('soporte.sistema',      'Soporte: ver logs tecnicos, estado del backend y parametros del sistema'),
    ('soporte.actividad',    'Soporte: ver historial de actividad y auditoria del sistema'),
    ('soporte.diagnosticos', 'Soporte: ver informacion de diagnostico tecnico de la sesion y entorno');

-- PERMISOS DEL ROL ADMIN
-- El admin gestiona usuarios y el sistema, pero NO califica tareas
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.code IN (
    'tasks.create', 'tasks.view.all', 'tasks.update.ungraded', 'tasks.delete.all',
    'tasks.assign', 'tasks.status.update',
    'users.view', 'users.create', 'users.edit', 'users.delete',
    'users.assign.role', 'users.deactivate',
    'calendar.create'
  );

-- PERMISOS DEL ROL INSTRUCTOR
-- El instructor gestiona tareas y calificaciones, pero NO administra usuarios
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'instructor'
  AND p.code IN (
    'tasks.create', 'tasks.view.all', 'tasks.update', 'tasks.delete.all',
    'tasks.assign', 'tasks.grade', 'tasks.status.update',
    'users.view',
    'calendar.create', 'calendar.assign'
  );

-- PERMISOS DEL ROL USER (ESTUDIANTE)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
  AND p.code IN (
    'tasks.view.own', 'tasks.status.update', 'tasks.comment',
    'notes.create', 'notes.view.own',
    'calendar.create'
  );

-- PERMISOS DEL ROL AUDITOR (3 permisos exclusivos)
-- Solo lectura -- accede a tareas, usuarios y reportes sin modificar nada
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor'
  AND p.code IN (
    'auditor.tareas',
    'auditor.usuarios',
    'auditor.reportes'
  );

-- PERMISOS DEL ROL COMUNICADOR (3 permisos exclusivos)
-- Crea anuncios y envia notificaciones -- no accede a tareas ni usuarios del sistema
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'comunicador'
  AND p.code IN (
    'comunicador.anuncios',
    'comunicador.notificaciones',
    'comunicador.historial'
  );

-- PERMISOS DEL ROL SOPORTE (3 permisos exclusivos)
-- Ve logs, actividad y diagnosticos -- no tiene seccion de usuarios standalone
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'soporte'
  AND p.code IN (
    'soporte.sistema',
    'soporte.actividad',
    'soporte.diagnosticos'
  );

-- ============================================================
-- PASO 4 -- PROMOVER A ADMIN (ejecutar DESPUES del registro)
-- ============================================================
-- Ejecutar este bloque en Workbench SOLO DESPUES de que Karol y Sebastian
-- se hayan registrado desde el navegador.
--
-- Documentos esperados al registrar:
--   Karol:     documento = '1097497001'
--   Sebastian: documento = '1234567002'
-- ============================================================

-- Cambia el rol primario a 'admin' en la tabla users
UPDATE users
SET role = 'admin'
WHERE documento IN ('1097497001', '1234567002');

-- Quita el rol 'user' de user_roles (ya no corresponde)
DELETE ur
FROM user_roles ur
INNER JOIN users u ON u.id  = ur.user_id
INNER JOIN roles r ON r.id  = ur.role_id
WHERE u.documento IN ('1097497001', '1234567002')
  AND r.name = 'user';

-- Agrega el rol 'admin' a user_roles para que el RBAC refleje el cambio
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.documento IN ('1097497001', '1234567002')
  AND r.name = 'admin';