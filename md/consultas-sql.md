# Consultas SQL — Base de datos `gestion_tareas_sena`

> Consultas listas para ejecutar en MySQL Workbench durante la presentación.
> Simulan lo que hace el sistema internamente cuando un admin, instructor o usuario realiza una acción.
> Ejecutarlas como `app_user` (no como root).

---

## USUARIOS

### Ver todos los usuarios del sistema (lo que ve el admin)
```sql
SELECT
    id,
    name,
    documento,
    email,
    role,
    is_active,
    DATE_FORMAT(created_at, '%d/%m/%Y') AS fecha_registro
FROM users
ORDER BY role ASC, name ASC;
```

### Ver solo los usuarios activos
```sql
SELECT id, name, email, role
FROM users
WHERE is_active = 1
ORDER BY name ASC;
```

### Ver los usuarios desactivados y el motivo
```sql
SELECT
    id,
    name,
    email,
    deactivation_reason,
    DATE_FORMAT(deactivation_date, '%d/%m/%Y %H:%i') AS fecha_desactivacion
FROM users
WHERE is_active = 0;
```

### Buscar un usuario por número de documento
```sql
SELECT id, name, email, role, is_active
FROM users
WHERE documento = '1234567890';
```

### Ver todos los estudiantes (rol user)
```sql
SELECT id, name, email, documento
FROM users
WHERE role = 'user'
  AND is_active = 1
ORDER BY name ASC;
```

### Ver roles de todos los usuarios (sistema RBAC)
```sql
SELECT
    u.id,
    u.name,
    u.email,
    r.name AS rol_rbac,
    u.role AS rol_directo
FROM users u
LEFT JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN roles r       ON r.id = ur.role_id
ORDER BY u.name ASC;
```

### Ver los permisos de un rol específico (ej: instructor)
```sql
SELECT
    r.name AS rol,
    p.code AS permiso
FROM roles r
INNER JOIN role_permissions rp ON rp.role_id = r.id
INNER JOIN permissions p       ON p.id = rp.permission_id
WHERE r.name = 'instructor'
ORDER BY p.code ASC;
```

### Ver todos los roles y sus permisos completos
```sql
SELECT
    r.name AS rol,
    GROUP_CONCAT(p.code ORDER BY p.code SEPARATOR ', ') AS permisos
FROM roles r
LEFT JOIN role_permissions rp ON rp.role_id = r.id
LEFT JOIN permissions p       ON p.id = rp.permission_id
GROUP BY r.name
ORDER BY r.name;
```

---

## TAREAS

### Ver todas las tareas del sistema (lo que ve el admin)
```sql
SELECT
    id,
    title,
    status,
    assigned_users,
    grade,
    comment,
    DATE_FORMAT(created_at, '%d/%m/%Y') AS fecha_creacion
FROM tasks
ORDER BY created_at DESC;
```

### Ver tareas por estado
```sql
-- Tareas pendientes
SELECT id, title, assigned_users FROM tasks WHERE status = 'pendiente';

-- Tareas en progreso
SELECT id, title, assigned_users FROM tasks WHERE status = 'en_progreso';

-- Tareas por aprobar (esperando revisión del instructor)
SELECT id, title, assigned_users FROM tasks WHERE status = 'pendiente_aprobacion';

-- Tareas completadas con nota
SELECT id, title, grade, grade_reason FROM tasks WHERE status = 'completada';

-- Tareas reprobadas
SELECT id, title, grade, grade_reason FROM tasks WHERE status = 'reprobada';
```

### Ver cuántas tareas hay por estado (dashboard)
```sql
SELECT
    status,
    COUNT(*) AS cantidad
FROM tasks
GROUP BY status
ORDER BY FIELD(status, 'pendiente', 'en_progreso', 'pendiente_aprobacion', 'completada', 'reprobada');
```

### Ver las tareas asignadas a un usuario específico
```sql
-- Reemplazar el 3 con el id del usuario que quieras consultar
SELECT
    id,
    title,
    status,
    grade,
    comment
FROM tasks
WHERE JSON_CONTAINS(assigned_users, CAST(3 AS JSON), '$')
ORDER BY created_at DESC;
```

### Ver las tareas con nota y quién las calificó
```sql
SELECT
    id,
    title,
    status,
    grade,
    grade_reason
FROM tasks
WHERE grade IS NOT NULL
ORDER BY grade DESC;
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
GROUP BY rango;
```

### Ver las tareas con los nombres de los usuarios asignados
```sql
-- Esta es la consulta más completa — muestra tareas con usuarios legibles
SELECT
    t.id,
    t.title,
    t.status,
    t.grade,
    JSON_UNQUOTE(JSON_EXTRACT(t.assigned_users, '$')) AS usuarios_asignados_ids
FROM tasks t
ORDER BY t.created_at DESC;
```

> Nota: el backend resuelve los IDs a nombres en memoria (no con SQL JOIN) porque
> `assigned_users` es una columna JSON con un arreglo de IDs, no una clave foránea.

---

## CALENDARIO

### Ver todos los eventos del sistema
```sql
SELECT
    ce.id,
    ce.title,
    DATE_FORMAT(ce.date, '%d/%m/%Y') AS fecha,
    ce.tipo,
    ce.color,
    u_instructor.name AS instructor,
    u_estudiante.name AS estudiante,
    t.title AS tarea_relacionada
FROM calendar_events ce
LEFT JOIN users u_instructor ON u_instructor.id = ce.instructor_id
LEFT JOIN users u_estudiante ON u_estudiante.id = ce.student_id
LEFT JOIN tasks t            ON t.id = ce.task_id
ORDER BY ce.date ASC;
```

### Ver los eventos de un instructor específico
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

---

## NOTAS PERSONALES (post-its)

### Ver todas las notas del sistema
```sql
SELECT
    un.id,
    u.name AS usuario,
    un.texto,
    un.color,
    DATE_FORMAT(un.created_at, '%d/%m/%Y %H:%i') AS fecha
FROM user_notes un
INNER JOIN users u ON u.id = un.user_id
ORDER BY un.created_at DESC;
```

### Ver las notas de un usuario específico
```sql
-- Reemplazar el 3 con el id del usuario
SELECT id, texto, color
FROM user_notes
WHERE user_id = 3
ORDER BY created_at ASC;
```

---

## VERIFICACIÓN DEL SISTEMA

### Verificar que la base de datos está bien configurada
```sql
-- Ver todas las tablas que existen
SHOW TABLES;
```

### Verificar que los roles y permisos están cargados
```sql
SELECT * FROM roles;
SELECT * FROM permissions;
```

### Conteo general del sistema
```sql
SELECT
    (SELECT COUNT(*) FROM users WHERE is_active = 1) AS usuarios_activos,
    (SELECT COUNT(*) FROM users WHERE is_active = 0) AS usuarios_inactivos,
    (SELECT COUNT(*) FROM tasks)                     AS total_tareas,
    (SELECT COUNT(*) FROM tasks WHERE grade IS NOT NULL) AS tareas_calificadas,
    (SELECT COUNT(*) FROM calendar_events)           AS total_eventos,
    (SELECT COUNT(*) FROM user_notes)                AS total_notas;
```

### Ver la estructura de la tabla users
```sql
DESCRIBE users;
```

### Ver la estructura de la tabla tasks
```sql
DESCRIBE tasks;
```

---

## SIMULACIÓN DE ACCIONES DEL SISTEMA

### Lo que hace el backend cuando un usuario hace login
```sql
-- loginService → getUserByEmail(email)
SELECT *
FROM users
WHERE email = 'correo@ejemplo.com'
LIMIT 1;
-- El backend compara req.body.password con el campo password usando bcrypt.compare()
```

### Lo que hace el backend cuando filtra tareas por usuario
```sql
-- filterTasks({ userId: 3 })
SELECT *
FROM tasks
WHERE JSON_CONTAINS(assigned_users, CAST(3 AS JSON), '$');
```

### Lo que hace el backend al desactivar un usuario
```sql
UPDATE users
SET is_active = 0,
    deactivation_reason = 'Motivo de desactivación',
    deactivation_date = NOW()
WHERE id = 5;
```

### Lo que hace el backend al calificar una tarea con nota >= 70
```sql
UPDATE tasks
SET grade = 85,
    grade_reason = 'Buen trabajo, documentación completa',
    status = 'completada'
WHERE id = 2;
```

### Lo que hace el backend al calificar con nota < 70
```sql
UPDATE tasks
SET grade = 55,
    grade_reason = 'Faltó la documentación técnica',
    status = 'reprobada'
WHERE id = 4;
```

### Lo que hace el backend al eliminar un usuario
```sql
-- Paso 1: eliminar el usuario
DELETE FROM users WHERE id = 7;

-- Paso 2: recalcular AUTO_INCREMENT para no reutilizar el ID
-- (el backend lo hace en dos pasos porque MySQL no permite subquery en ALTER TABLE)
SELECT COALESCE(MAX(id), 0) AS maxId FROM users;
ALTER TABLE users AUTO_INCREMENT = 8;  -- maxId + 1
```
