# Consultas SQL — Base de datos `gestion_tareas_sena`

> Consultas listas para ejecutar en MySQL Workbench durante la presentación.
> Simulan lo que hace el sistema internamente cuando un admin, instructor o usuario realiza una acción.
> Ejecutarlas como `app_user` (no como root).
>
> **IMPORTANTE:** La base de datos está en 3FN con tablas pivote.
> Las relaciones muchos a muchos ya NO usan columnas JSON — usan JOINs reales.

---

## ESTRUCTURA DE TABLAS (resumen para la exposición)

```
RBAC (Control de acceso por roles):
  roles               → 6 roles del sistema (admin, instructor, user, auditor, comunicador, soporte)
  permissions         → permisos atómicos con formato 'recurso.accion'
  role_permissions    → pivote N:M roles ↔ permisos
  user_roles          → pivote N:M usuarios ↔ roles (primario + adicionales)
  user_extra_permissions → permisos específicos elegidos por el admin para roles adicionales

Usuarios:
  users               → usuarios con soft delete (deleted_at) y estado (is_active)

Tareas:
  tasks               → tareas con ciclo de vida: pendiente → en_progreso → pendiente_aprobacion → completada/reprobada
  task_users          → pivote N:M tareas ↔ usuarios asignados (reemplaza assigned_users JSON)
  task_comments       → comentarios anidados (estudiante pregunta, instructor responde)
  task_state_notifications         → notificaciones cuando instructor cambia estado de una tarea
  task_state_notification_recipients → qué estudiantes deben leer cada notificación

Calendario y notas:
  calendar_events     → eventos del calendario (propios o asignados a estudiantes)
  user_notes          → notas personales tipo post-it del estudiante

Comunicador:
  comunicador_anuncios              → anuncios globales del módulo comunicador
  comunicador_notificaciones        → notificaciones personalizadas por rol
  comunicador_notificaciones_roles  → pivote: qué roles reciben cada notificación
  comunicador_notificaciones_leidas → qué usuarios ya leyeron cada notificación
```

---

## ROLES Y PERMISOS (RBAC)

### Ver todos los roles del sistema
```sql
SELECT id, name AS slug, label AS nombre_legible, color, descripcion
FROM roles
ORDER BY id;
```

### Ver todos los permisos del sistema
```sql
SELECT id, code AS permiso, descripcion
FROM permissions
ORDER BY code;
```

### Ver los permisos de cada rol (JOIN entre 3 tablas — demostración de normalización)
```sql
SELECT
    r.name   AS rol,
    r.label  AS nombre_legible,
    p.code   AS permiso,
    p.descripcion
FROM roles r
JOIN role_permissions rp ON rp.role_id    = r.id
JOIN permissions p        ON p.id          = rp.permission_id
ORDER BY r.name, p.code;
```

### Ver los permisos de un rol específico (ej: instructor)
```sql
SELECT r.name AS rol, p.code AS permiso, p.descripcion
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p        ON p.id       = rp.permission_id
WHERE r.name = 'instructor'
ORDER BY p.code;
```

### Ver todos los roles y sus permisos agrupados (para mostrar en la exposición)
```sql
SELECT
    r.name  AS rol,
    r.label AS nombre_legible,
    GROUP_CONCAT(p.code ORDER BY p.code SEPARATOR ', ') AS permisos
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p       ON p.id       = rp.permission_id
GROUP BY r.id
ORDER BY r.name;
```

### Ver qué roles tiene cada usuario (tabla pivote user_roles)
```sql
SELECT
    u.id,
    u.name   AS usuario,
    u.email,
    u.role   AS rol_primario,
    GROUP_CONCAT(r.name ORDER BY r.name SEPARATOR ', ') AS todos_los_roles
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r       ON r.id       = ur.role_id
WHERE u.deleted_at IS NULL
GROUP BY u.id
ORDER BY u.role, u.name;
```

### Ver los permisos extra de un usuario específico
```sql
-- Reemplazar el 3 con el id del usuario
SELECT
    u.name   AS usuario,
    p.code   AS permiso_extra,
    r.name   AS rol_origen,
    p.descripcion
FROM users u
JOIN user_extra_permissions uep ON uep.user_id    = u.id
JOIN permissions p              ON p.id            = uep.permission_id
LEFT JOIN roles r               ON r.id            = uep.rol_origen_id
WHERE u.id = 3
ORDER BY p.code;
```

---

## USUARIOS

### Ver todos los usuarios activos (no soft-deleted)
```sql
SELECT
    id,
    name      AS nombre,
    documento,
    email,
    role      AS rol_primario,
    is_active,
    DATE_FORMAT(created_at, '%d/%m/%Y') AS fecha_registro
FROM users
WHERE deleted_at IS NULL
ORDER BY role, name;
```

### Ver solo los usuarios activos y sin soft delete
```sql
SELECT id, name, email, role
FROM users
WHERE is_active = 1
  AND deleted_at IS NULL
ORDER BY name;
```

### Ver los usuarios desactivados y el motivo
```sql
SELECT
    id,
    name,
    email,
    deactivation_reason                                           AS motivo_desactivacion,
    DATE_FORMAT(deactivation_date, '%d/%m/%Y %H:%i')             AS fecha_desactivacion
FROM users
WHERE is_active = 0
  AND deleted_at IS NULL;
```

### Ver los usuarios con soft delete (eliminados estándar, recuperables)
```sql
SELECT
    id,
    name,
    email,
    soft_delete_reason                                     AS motivo_eliminacion,
    DATE_FORMAT(deleted_at, '%d/%m/%Y %H:%i')              AS fecha_eliminacion,
    DATE_FORMAT(DATE_ADD(deleted_at, INTERVAL 30 DAY), '%d/%m/%Y') AS fecha_limite_recuperacion
FROM users
WHERE deleted_at IS NOT NULL
ORDER BY deleted_at DESC;
```

### Buscar un usuario por número de documento
```sql
SELECT id, name, email, role, is_active
FROM users
WHERE documento = '1234567890';
```

### Ver todos los estudiantes activos
```sql
SELECT id, name, email, documento
FROM users
WHERE role = 'user'
  AND is_active = 1
  AND deleted_at IS NULL
ORDER BY name;
```

---

## TAREAS

### Ver todas las tareas con sus estudiantes asignados (JOIN con tabla pivote task_users)
```sql
-- Esta es la consulta clave — demuestra que task_users reemplazó el JSON
SELECT
    t.id,
    t.title                                              AS titulo,
    t.status                                             AS estado,
    t.grade                                              AS nota,
    t.grade_reason                                       AS motivo_calificacion,
    DATE_FORMAT(t.created_at, '%d/%m/%Y')               AS fecha_creacion,
    GROUP_CONCAT(tu.user_name_snapshot SEPARATOR ', ')  AS estudiantes_asignados
FROM tasks t
LEFT JOIN task_users tu ON tu.task_id = t.id
GROUP BY t.id
ORDER BY t.created_at DESC;
```

### Ver tareas por estado
```sql
-- Pendientes
SELECT id, title FROM tasks WHERE status = 'pendiente';

-- En progreso
SELECT id, title FROM tasks WHERE status = 'en_progreso';

-- Por aprobar (esperando revisión del instructor)
SELECT id, title FROM tasks WHERE status = 'pendiente_aprobacion';

-- Completadas con nota
SELECT id, title, grade, grade_reason FROM tasks WHERE status = 'completada';

-- Reprobadas
SELECT id, title, grade, grade_reason FROM tasks WHERE status = 'reprobada';
```

### Ver conteo de tareas por estado (dashboard)
```sql
SELECT
    status                AS estado,
    COUNT(*)              AS cantidad
FROM tasks
GROUP BY status
ORDER BY FIELD(status, 'pendiente', 'en_progreso', 'pendiente_aprobacion', 'completada', 'reprobada');
```

### Ver las tareas asignadas a un estudiante específico (JOIN con pivote)
```sql
-- Reemplazar el 3 con el id del estudiante
SELECT
    t.id,
    t.title,
    t.status,
    t.grade,
    t.comment
FROM tasks t
JOIN task_users tu ON tu.task_id = t.id
WHERE tu.user_id = 3
ORDER BY t.created_at DESC;
```

### Ver la distribución de notas
```sql
SELECT
    CASE
        WHEN grade >= 90 THEN 'Excelente (90-100)'
        WHEN grade >= 70 THEN 'Aprobado (70-89)'
        WHEN grade >= 50 THEN 'Regular (50-69)'
        ELSE 'Reprobado (0-49)'
    END AS rango,
    COUNT(*) AS cantidad
FROM tasks
WHERE grade IS NOT NULL
GROUP BY rango
ORDER BY MIN(grade) DESC;
```

### Ver cuántos estudiantes tiene asignada cada tarea
```sql
SELECT
    t.id,
    t.title,
    t.status,
    COUNT(tu.user_id) AS num_estudiantes
FROM tasks t
LEFT JOIN task_users tu ON tu.task_id = t.id
GROUP BY t.id
ORDER BY num_estudiantes DESC;
```

---

## COMENTARIOS EN TAREAS (task_comments)

### Ver todos los comentarios de una tarea con su tipo
```sql
-- Reemplazar el 5 con el id de la tarea
SELECT
    tc.id,
    tc.user_name_snapshot  AS autor,
    tc.tipo,
    tc.comentario,
    tc.parent_id           AS responde_a,
    DATE_FORMAT(tc.created_at, '%d/%m/%Y %H:%i') AS fecha
FROM task_comments tc
WHERE tc.task_id = 5
ORDER BY tc.created_at ASC;
```

### Ver comentarios raíz vs respuestas de una tarea
```sql
SELECT
    tc.id,
    tc.user_name_snapshot AS autor,
    tc.tipo,
    tc.comentario,
    CASE WHEN tc.parent_id IS NULL THEN 'Comentario raíz' ELSE CONCAT('Responde al comentario #', tc.parent_id) END AS contexto
FROM task_comments tc
WHERE tc.task_id = 5
ORDER BY tc.parent_id ASC, tc.created_at ASC;
```

---

## NOTIFICACIONES DE CAMBIO DE ESTADO

### Ver notificaciones pendientes de leer de un estudiante
```sql
-- Reemplazar el 3 con el id del estudiante
SELECT
    tsn.id            AS notificacion_id,
    t.title           AS tarea,
    tsn.justificacion AS razon_del_cambio,
    tsnr.leida,
    DATE_FORMAT(tsn.created_at, '%d/%m/%Y %H:%i') AS fecha
FROM task_state_notifications tsn
JOIN tasks t ON t.id = tsn.task_id
JOIN task_state_notification_recipients tsnr ON tsnr.notification_id = tsn.id
WHERE tsnr.user_id = 3
  AND tsnr.leida = 0
ORDER BY tsn.created_at DESC;
```

### Contar notificaciones no leídas de un estudiante (badge en el dashboard)
```sql
SELECT COUNT(*) AS no_leidas
FROM task_state_notification_recipients tsnr
WHERE tsnr.user_id = 3
  AND tsnr.leida = 0;
```

---

## CALENDARIO

### Ver todos los eventos del sistema (con instructor y estudiante resueltos)
```sql
SELECT
    ce.id,
    ce.title                                        AS titulo,
    DATE_FORMAT(ce.date, '%d/%m/%Y')               AS fecha,
    ce.tipo,
    ce.color,
    u_instructor.name                               AS instructor,
    u_estudiante.name                               AS estudiante,
    t.title                                         AS tarea_relacionada
FROM calendar_events ce
LEFT JOIN users u_instructor ON u_instructor.id = ce.instructor_id
LEFT JOIN users u_estudiante ON u_estudiante.id = ce.student_id
LEFT JOIN tasks t             ON t.id            = ce.task_id
ORDER BY ce.date ASC;
```

### Ver los eventos asignados a un estudiante
```sql
-- Reemplazar el 3 con el id del estudiante
SELECT
    ce.id,
    ce.title,
    DATE_FORMAT(ce.date, '%d/%m/%Y') AS fecha,
    ce.tipo,
    t.title AS tarea_vinculada
FROM calendar_events ce
LEFT JOIN tasks t ON t.id = ce.task_id
WHERE ce.student_id = 3
ORDER BY ce.date ASC;
```

### Ver los eventos de un instructor (propios y asignados)
```sql
-- Reemplazar el 1 con el id del instructor
SELECT
    id,
    title,
    DATE_FORMAT(date, '%d/%m/%Y') AS fecha,
    tipo,
    student_id,
    task_id
FROM calendar_events
WHERE instructor_id = 1
ORDER BY date ASC;
```

---

## NOTAS PERSONALES

### Ver todas las notas del sistema
```sql
SELECT
    un.id,
    u.name                                          AS usuario,
    un.texto,
    un.color,
    DATE_FORMAT(un.created_at, '%d/%m/%Y %H:%i')  AS fecha
FROM user_notes un
JOIN users u ON u.id = un.user_id
ORDER BY un.created_at DESC;
```

### Ver las notas de un usuario específico
```sql
SELECT id, texto, color
FROM user_notes
WHERE user_id = 3
ORDER BY created_at ASC;
```

---

## MÓDULO COMUNICADOR

### Ver todos los anuncios publicados
```sql
SELECT
    ca.id,
    u.name                                         AS autor,
    ca.titulo,
    ca.contenido,
    DATE_FORMAT(ca.created_at, '%d/%m/%Y %H:%i') AS fecha_publicacion
FROM comunicador_anuncios ca
JOIN users u ON u.id = ca.autor_id
ORDER BY ca.created_at DESC;
```

### Ver notificaciones del comunicador con sus roles destino
```sql
SELECT
    cn.id,
    u.name                                         AS autor,
    cn.titulo,
    GROUP_CONCAT(r.name SEPARATOR ', ')           AS roles_destino,
    DATE_FORMAT(cn.created_at, '%d/%m/%Y %H:%i') AS fecha
FROM comunicador_notificaciones cn
JOIN users u ON u.id = cn.autor_id
JOIN comunicador_notificaciones_roles cnr ON cnr.notificacion_id = cn.id
JOIN roles r                              ON r.id                = cnr.role_id
GROUP BY cn.id
ORDER BY cn.created_at DESC;
```

---

## VERIFICACIÓN DEL SISTEMA

### Ver todas las tablas que existen
```sql
SHOW TABLES;
```

### Conteo general del sistema
```sql
SELECT
    (SELECT COUNT(*) FROM users WHERE is_active = 1 AND deleted_at IS NULL) AS usuarios_activos,
    (SELECT COUNT(*) FROM users WHERE is_active = 0)                         AS usuarios_desactivados,
    (SELECT COUNT(*) FROM users WHERE deleted_at IS NOT NULL)                 AS usuarios_soft_deleted,
    (SELECT COUNT(*) FROM tasks)                                              AS total_tareas,
    (SELECT COUNT(*) FROM tasks WHERE grade IS NOT NULL)                      AS tareas_calificadas,
    (SELECT COUNT(*) FROM task_users)                                         AS asignaciones_tarea_usuario,
    (SELECT COUNT(*) FROM task_comments)                                      AS total_comentarios,
    (SELECT COUNT(*) FROM calendar_events)                                    AS total_eventos,
    (SELECT COUNT(*) FROM user_notes)                                         AS total_notas,
    (SELECT COUNT(*) FROM comunicador_anuncios)                               AS total_anuncios;
```

### Ver la estructura de las tablas clave
```sql
DESCRIBE users;
DESCRIBE tasks;
DESCRIBE task_users;
DESCRIBE role_permissions;
DESCRIBE user_roles;
DESCRIBE user_extra_permissions;
```

---

## SIMULACIÓN DE ACCIONES DEL SISTEMA

### Lo que hace el backend cuando un usuario hace login
```sql
-- auth.service.js → getUserByEmail(email)
SELECT *
FROM users
WHERE email = 'correo@ejemplo.com'
  AND deleted_at IS NULL
LIMIT 1;
-- El backend luego: bcrypt.compare(password, user.password)
-- Si ok: busca permisos nativos del rol + permisos extra del user_extra_permissions
-- Construye el JWT con { userId, role, permisos: [...nativo, ...extra] }
```

### Lo que hace el backend para construir el JWT (permisos del usuario)
```sql
-- Permisos nativos del rol primario
SELECT p.code
FROM role_permissions rp
JOIN permissions p ON p.id    = rp.permission_id
JOIN roles r       ON r.id    = rp.role_id
WHERE r.name = 'admin';

-- Permisos extra del usuario (roles adicionales seleccionados por el admin)
SELECT p.code
FROM user_extra_permissions uep
JOIN permissions p ON p.id = uep.permission_id
WHERE uep.user_id = 3;

-- El backend combina los dos arrays y los incluye en el payload del JWT
```

### Lo que hace el backend al asignar una tarea (tabla pivote task_users)
```sql
-- Antes (MAL — columna JSON, violaba 1FN):
-- UPDATE tasks SET assigned_users = '[2, 5, 8]' WHERE id = 10;

-- Ahora (BIEN — tabla pivote, 3FN):
INSERT INTO task_users (task_id, user_id, user_name_snapshot)
VALUES (10, 2, 'Juan Pérez'),
       (10, 5, 'María López'),
       (10, 8, 'Carlos Torres');
```

### Lo que hace el backend al calificar una tarea con nota >= 70
```sql
UPDATE tasks
SET grade        = 85,
    grade_reason = 'Buen trabajo, documentación completa',
    status       = 'completada'
WHERE id = 2;
```

### Lo que hace el backend al calificar con nota < 70
```sql
UPDATE tasks
SET grade        = 55,
    grade_reason = 'Faltó la documentación técnica',
    status       = 'reprobada'
WHERE id = 4;
```

### Lo que hace el backend al hacer soft delete de un usuario
```sql
UPDATE users
SET deleted_at          = NOW(),
    soft_delete_reason  = 'Motivo de eliminación estándar'
WHERE id = 7;
-- El usuario desaparece de las vistas pero existe en BD durante 30 días
-- Los task_users y task_comments de ese usuario mantienen sus snapshots
```

### Lo que hace el backend al hacer force delete (eliminación forzosa)
```sql
-- CASCADE elimina: user_roles, user_extra_permissions, user_notes, refresh_tokens
-- task_users.user_id queda NULL (ON DELETE SET NULL) — el snapshot se preserva
-- task_comments.user_id queda NULL (ON DELETE SET NULL) — el snapshot se preserva
DELETE FROM users WHERE id = 7;
```

### Lo que hace el backend al desactivar un usuario
```sql
UPDATE users
SET is_active           = 0,
    deactivation_reason = 'No completó las tareas asignadas',
    deactivation_date   = NOW()
WHERE id = 5;
-- El usuario existe pero no puede hacer login (loginService detecta is_active = 0)
```

### Lo que hace el backend al cambiar el estado de una tarea con justificación
```sql
-- Paso 1: actualizar la tarea
UPDATE tasks
SET status        = 'en_progreso',
    change_reason = 'La tarea necesita correcciones antes de aprobarse'
WHERE id = 3;

-- Paso 2: crear la notificación
INSERT INTO task_state_notifications (task_id, instructor_id, justificacion)
VALUES (3, 1, 'La tarea necesita correcciones antes de aprobarse');

-- Paso 3: crear una fila por cada estudiante asignado (para el badge de no leído)
INSERT INTO task_state_notification_recipients (notification_id, user_id, leida)
SELECT LAST_INSERT_ID(), user_id, 0
FROM task_users
WHERE task_id = 3 AND user_id IS NOT NULL;
```

### Lo que hace el backend al recuperar un usuario (revertir soft delete)
```sql
UPDATE users
SET deleted_at         = NULL,
    soft_delete_reason = NULL
WHERE id = 7
  AND deleted_at IS NOT NULL
  AND deleted_at > DATE_SUB(NOW(), INTERVAL 30 DAY);
-- Solo funciona si han pasado menos de 30 días desde la eliminación estándar
```

---

## CONSULTAS PARA DEMOSTRAR 3FN EN LA EXPOSICIÓN

> Mostrar estas dos consultas juntas para demostrar la diferencia antes/después.

### Por qué las tablas pivote son mejores que JSON

```sql
-- ❌ ANTES — no se podía hacer JOIN, había que parsear el JSON en el backend:
-- SELECT * FROM tasks WHERE JSON_CONTAINS(assigned_users, CAST(3 AS JSON), '$')

-- ✅ AHORA — JOIN normal, eficiente, con índices, SQL puro:
SELECT t.id, t.title, t.status
FROM tasks t
JOIN task_users tu ON tu.task_id = t.id
WHERE tu.user_id = 3;
```

### La misma lógica aplica a role_permissions:

```sql
-- ❌ ANTES — permisos hardcodeados en JavaScript (no en BD):
-- const PERMISOS = { admin: ['tasks.create', 'users.delete', ...] }

-- ✅ AHORA — en BD con JOIN, fácil de auditar y modificar sin tocar código:
SELECT r.name AS rol, p.code AS permiso
FROM roles r
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p        ON p.id       = rp.permission_id
WHERE r.name = 'admin'
ORDER BY p.code;
```
