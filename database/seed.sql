-- ============================================================
-- ARCHIVO: database/seed.sql
-- Paso 3 — Ejecutar DESPUÉS de schema.sql con conexión app_user
-- Inserta los datos iniciales: roles, permisos y sus relaciones (RBAC completo)
--
-- SIN DROP de ningún tipo — el usuario ya eliminó el schema manualmente.
-- Todos los INSERT usan INSERT IGNORE para que re-ejecutar este archivo
-- no falle por duplicados (idempotente: seguro correr N veces).
--
-- NO se insertan usuarios aquí: los usuarios se crean desde el formulario
-- de registro en el navegador (el backend hashea la contraseña con bcrypt).
-- Nunca hardcodear hashes de contraseña en archivos de seed.
-- ============================================================

USE gestion_tareas_sena;

-- ============================================================
-- SECCIÓN 1 — ROLES DEL SISTEMA (6 roles)
-- ============================================================
-- INSERT IGNORE: si el role ya existe (name es UNIQUE), lo omite sin error.
-- Roles BASE: cada uno tiene su propia vista SPA activa (body[data-modo]).
-- Roles ADICIONALES: pueden asignarse como rol primario O combinarse
--   con un rol base para agregar secciones extra en el sidebar del usuario.
INSERT IGNORE INTO roles (name, label, color, descripcion) VALUES
    -- Administrador: panel completo de gestión del sistema
    ('admin',       'Administrador',        '#0ea5e9', 'Gestiona usuarios, roles y configuracion del sistema'),
    -- Instructor: panel de tareas, calificaciones y calendario de estudiantes
    ('instructor',  'Instructor / Docente', '#10b981', 'Crea y califica tareas, gestiona el calendario de estudiantes'),
    -- Estudiante: panel personal con tareas asignadas, notas y calendario
    ('user',        'Estudiante',           '#8b5cf6', 'Visualiza sus tareas asignadas, notas personales y calendario'),
    -- Auditor: solo lectura — ve tareas, usuarios y reportes sin modificar nada
    ('auditor',     'Auditor',              '#fb923c', 'Solo lectura: ve tareas, usuarios, actividad y reportes sin modificar nada'),
    -- Comunicador: crea anuncios y envía notificaciones personalizadas por rol
    ('comunicador', 'Comunicador',          '#84cc16', 'Crea y gestiona anuncios del sistema y envia notificaciones personalizadas'),
    -- Soporte: accede a logs técnicos del sistema para brindar soporte
    ('soporte',     'Soporte',              '#f87171', 'Accede a logs tecnicos y actividad del sistema para brindar soporte');

-- ============================================================
-- SECCIÓN 2 — PERMISOS DEL SISTEMA
-- ============================================================
-- El `code` es la clave que viaja en el JWT y verifica el middleware de autorización.
-- Formato "recurso.accion" para permisos compartidos; "rol.recurso" para permisos exclusivos.
-- INSERT IGNORE: si el permiso ya existe (code es UNIQUE), lo omite sin error.
INSERT IGNORE INTO permissions (code, descripcion) VALUES

    -- ── Tareas: permisos compartidos entre admin e instructor ─────────────────
    ('tasks.create',          'Crear nuevas tareas en el sistema'),
    ('tasks.view.all',        'Ver todas las tareas sin importar a quien esten asignadas'),
    ('tasks.view.own',        'Ver solo las tareas asignadas al propio usuario'),
    ('tasks.update',          'Editar tareas existentes (cualquier tarea)'),
    ('tasks.update.ungraded', 'Editar tareas que aun no han sido calificadas'),
    ('tasks.delete.all',      'Eliminar cualquier tarea del sistema'),
    ('tasks.assign',          'Asignar y desasignar usuarios en tareas'),
    ('tasks.grade',           'Asignar nota y comentario de calificacion a una tarea'),
    ('tasks.status.update',   'Cambiar el estado de una tarea en su ciclo de vida'),
    ('tasks.comment',         'Agregar comentarios a tareas calificadas'),

    -- ── Usuarios: permisos de gestión del admin ───────────────────────────────
    ('users.view',            'Ver la lista de usuarios registrados en el sistema'),
    ('users.create',          'Crear nuevos usuarios desde el panel de administracion'),
    ('users.edit',            'Editar los datos de un usuario (documento, nombre, correo)'),
    ('users.delete',          'Eliminar usuarios del sistema (estandar o forzoso)'),
    ('users.assign.role',     'Asignar y gestionar los roles de un usuario'),
    ('users.deactivate',      'Desactivar o reactivar cuentas de usuario'),

    -- ── Calendario: permisos de instructor y estudiante ────────────────────────
    -- calendar.create: crear eventos propios — todos los roles que lo tengan pueden crear
    -- calendar.assign: asignar eventos a estudiantes específicos — exclusivo del instructor
    ('calendar.create',       'Crear eventos propios en el calendario personal'),
    ('calendar.assign',       'Asignar eventos del calendario a estudiantes especificos'),

    -- ── Notas: permisos exclusivos del estudiante ─────────────────────────────
    ('notes.create',          'Crear y gestionar notas personales tipo post-it'),
    ('notes.view.own',        'Ver las notas personales propias'),

    -- ── Auditor: 3 permisos de solo lectura (prefijo auditor.*) ───────────────
    -- El prefijo auditor.* garantiza que estos permisos no colisionen con otros roles.
    -- Cuando auditor es rol adicional, el admin elige cuáles de estos 3 otorgar.
    ('auditor.tareas',        'Auditor: ver todas las tareas del sistema en modo solo lectura'),
    ('auditor.usuarios',      'Auditor: ver todos los usuarios del sistema en modo solo lectura'),
    ('auditor.reportes',      'Auditor: ver reportes, metricas y estadisticas del sistema'),

    -- ── Comunicador: 1 permiso de comunicación (prefijo comunicador.*) ────────
    -- Cuando comunicador es rol adicional, el admin elige si conceder este permiso.
    ('comunicador.anuncios', 'Comunicador: crear y gestionar anuncios para todos los usuarios'),

    -- ── Soporte: 3 permisos técnicos (prefijo soporte.*) ────────────────────────
    -- Cuando soporte es rol adicional, el admin elige cuáles de estos 2 otorgar.
    ('soporte.sistema',   'Soporte: ver logs tecnicos, estado del backend y parametros del sistema'),
    ('soporte.actividad', 'Soporte: ver historial de actividad y auditoria del sistema');

-- ============================================================
-- SECCIÓN 3 — ASIGNACIÓN DE PERMISOS A ROLES (role_permissions)
-- ============================================================
-- INSERT IGNORE: si la combinación (role_id, permission_id) ya existe, la omite.
-- Cada bloque INSERT SELECT construye las filas de la tabla pivote
-- buscando los IDs por nombre — no se usan IDs hardcodeados para evitar
-- errores si el AUTO_INCREMENT del rol o permiso cambia.

-- ── Admin: gestión completa del sistema excepto calificar tareas ──────────────
-- El admin NO tiene tasks.grade porque calificar es responsabilidad del instructor.
-- El admin SÍ puede editar tareas no calificadas (tasks.update.ungraded).
-- El admin NO tiene permisos de calendario por defecto; los obtiene solo si se le
-- asigna el rol instructor como secundario (calendar.create + calendar.assign).
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin'
  AND p.code IN (
    'tasks.create',          -- crear tareas nuevas
    'tasks.view.all',        -- ver todas las tareas del sistema
    'tasks.update.ungraded', -- editar tareas que aún no tienen nota
    'tasks.delete.all',      -- eliminar cualquier tarea
    'tasks.assign',          -- asignar/desasignar estudiantes en tareas
    'tasks.status.update',   -- cambiar el estado de una tarea
    'users.view',            -- ver la lista de usuarios
    'users.create',          -- crear usuarios desde el panel
    'users.edit',            -- editar datos de usuarios
    'users.delete',          -- eliminar usuarios (soft o forzoso)
    'users.assign.role',     -- gestionar los roles adicionales de un usuario
    'users.deactivate',      -- desactivar/reactivar cuentas
    'soporte.actividad'      -- historial de acciones del sistema (siempre visible en sidebar del admin)
  );

-- ── Instructor: gestión de tareas, calificaciones y calendario ────────────────
-- El instructor SÍ tiene tasks.grade (calificar) y calendar.assign (asignar eventos).
-- El instructor puede ver usuarios para asignarles tareas y eventos.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'instructor'
  AND p.code IN (
    'tasks.create',    -- crear tareas para estudiantes
    'tasks.view.all',  -- ver todas las tareas del sistema
    'tasks.update',    -- editar cualquier tarea
    'tasks.delete.all', -- eliminar cualquier tarea
    'tasks.assign',    -- asignar/desasignar estudiantes en tareas
    'tasks.grade',     -- asignar nota y comentario de calificación
    'tasks.status.update', -- cambiar el estado de una tarea
    'users.view',      -- ver la lista de estudiantes para asignar
    'calendar.create', -- crear eventos propios (recordatorios personales)
    'calendar.assign'  -- asignar eventos del calendario a estudiantes
  );

-- ── Estudiante (user): acceso limitado a sus propias tareas y datos ───────────
-- El estudiante NO puede ver tareas de otros ni gestionar usuarios.
-- Solo puede ver sus propias tareas, crear notas personales y crear eventos propios.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'user'
  AND p.code IN (
    'tasks.view.own',    -- ver solo las tareas asignadas al propio estudiante
    'tasks.status.update', -- cambiar el estado de sus propias tareas
    'tasks.comment',     -- agregar comentarios en tareas calificadas
    'notes.create',      -- crear notas personales tipo post-it
    'notes.view.own',    -- ver sus propias notas personales
    'calendar.create'    -- crear eventos personales propios en el calendario
  );

-- ── Auditor: solo lectura — 3 permisos exclusivos ────────────────────────────
-- El auditor observa tareas, usuarios y reportes sin modificar nada.
-- Cuando auditor es rol ADICIONAL, el admin puede seleccionar
-- 1, 2 o los 3 permisos de esta lista para otorgar al usuario base.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor'
  AND p.code IN (
    'auditor.tareas',    -- ver todas las tareas en modo solo lectura
    'auditor.usuarios',  -- ver todos los usuarios en modo solo lectura
    'auditor.reportes'   -- ver reportes, métricas y estadísticas
  );

-- ── Comunicador: 1 permiso de comunicación ─────────────────────────────────
-- El comunicador crea anuncios globales visibles para todos los usuarios.
-- Cuando comunicador es rol ADICIONAL, el admin puede seleccionar
-- este permiso para otorgarlo al usuario base.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'comunicador'
  AND p.code IN (
    'comunicador.anuncios'  -- crear y gestionar anuncios globales
  );

-- ── Soporte: 3 permisos técnicos ─────────────────────────────────────────────
-- El soporte accede a logs e información técnica del sistema.
-- Cuando soporte es rol ADICIONAL, el admin puede seleccionar
-- 1, 2 o los 3 permisos de esta lista para otorgar al usuario base.
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'soporte'
  AND p.code IN (
    'soporte.sistema',   -- ver logs técnicos y parámetros del backend
    'soporte.actividad'  -- ver historial de actividad y auditoría del sistema
  );

-- ============================================================
-- PASO 4 — PROMOVER A ADMIN (ejecutar DESPUÉS del registro)
-- ============================================================
-- Ejecutar este bloque en Workbench SOLO DESPUÉS de que Karol y Sebastián
-- se hayan registrado desde el navegador.
--
-- Documentos esperados al registrar:
--   Karol:     documento = '1097497001'
--   Sebastián: documento = '1234567002'
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
