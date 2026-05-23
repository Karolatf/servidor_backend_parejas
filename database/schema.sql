-- ============================================================
-- ARCHIVO: database/schema.sql
-- Paso 2 — Ejecutar en Workbench con conexión app_user
-- Crea TODAS las tablas del sistema: RBAC normalizado, tareas,
-- calendario, notificaciones de estado y módulo comunicador
--
-- SIN DROP de ningún tipo: el usuario elimina el schema manualmente
-- desde Workbench (clic derecho → Drop Schema) antes de ejecutar.
-- IF NOT EXISTS garantiza que este archivo se puede re-ejecutar
-- N veces sin error si alguna tabla ya existe.
-- ============================================================

USE gestion_tareas_sena;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  BLOQUE 1 — RBAC: Roles, Permisos y sus relaciones          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── TABLA: roles ──────────────────────────────────────────────
-- Define los 6 roles disponibles en el sistema.
-- Roles BASE (admin, instructor, user): cada uno tiene una vista SPA propia.
--   El campo `name` coincide con el valor de body[data-modo] en el frontend.
-- Roles ADICIONALES (auditor, comunicador, soporte): pueden asignarse como
--   rol primario O combinarse con un rol base para agregar secciones extra
--   en el sidebar sin cambiar la vista SPA activa.
-- `color`: hex del color de este rol, usado en badges del panel admin.
CREATE TABLE IF NOT EXISTS roles (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(50)  NOT NULL UNIQUE,            -- slug del rol: 'admin', 'instructor', 'user', 'auditor', 'comunicador', 'soporte'
    label       VARCHAR(80)  NOT NULL,                   -- nombre legible: 'Administrador', 'Instructor / Docente', etc.
    color       VARCHAR(20)  NOT NULL DEFAULT '#6b7280', -- color hex para badges y tarjetas de rol
    descripcion VARCHAR(200) NULL,                       -- descripción del rol (aparece en el modal de gestión)
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,  -- fecha de creación del registro

    PRIMARY KEY (id)
);

-- ── TABLA: permissions ────────────────────────────────────────
-- Define los permisos atómicos del sistema con formato "recurso.accion".
-- El campo `code` es lo que viaja en el payload del JWT y lo que verifica
-- el middleware de autorización (authorization.middleware.js) en cada endpoint.
-- Los permisos con prefijo específico ('auditor.*', 'comunicador.*', 'soporte.*')
-- son exclusivos de esos roles adicionales y no se superponen con roles base.
CREATE TABLE IF NOT EXISTS permissions (
    id          INT          NOT NULL AUTO_INCREMENT,
    code        VARCHAR(100) NOT NULL UNIQUE,  -- clave del permiso: 'tasks.create', 'auditor.tareas', etc.
    descripcion VARCHAR(200) NULL,             -- descripción legible del permiso (aparece en checkboxes del admin)
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);

-- ── TABLA: role_permissions ───────────────────────────────────
-- Tabla pivote N:M entre roles y permisos (Tercera Forma Normal).
-- Un rol puede tener muchos permisos; un permiso puede pertenecer a muchos roles.
-- La PK compuesta (role_id, permission_id) garantiza que no existan filas duplicadas.
-- Al eliminar un rol o permiso → sus registros aquí se eliminan en cascada.
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       INT NOT NULL,  -- FK al rol que posee el permiso
    permission_id INT NOT NULL,  -- FK al permiso que posee el rol

    PRIMARY KEY (role_id, permission_id),                                          -- PK compuesta: garantiza unicidad sin columna id separada

    CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  BLOQUE 2 — Usuarios y sus roles/permisos                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── TABLA: users ──────────────────────────────────────────────
-- Almacena todos los usuarios del sistema.
-- `role` es el ROL PRIMARIO: determina qué vista SPA se activa (body[data-modo]).
--   Los permisos reales del usuario = role_permissions[rol primario]
--   + los permisos de roles adicionales seleccionados en user_extra_permissions.
-- `is_active`: desactivación lógica (1=activo, 0=bloqueado por admin). La cuenta
--   existe en BD pero no puede iniciar sesión mientras is_active = 0.
-- `deleted_at`: soft delete recuperable hasta 30 días después de la eliminación.
--   NULL = cuenta activa; timestamp = cuenta eliminada pero recuperable.
CREATE TABLE IF NOT EXISTS users (
    id                  INT          NOT NULL AUTO_INCREMENT,
    documento           VARCHAR(20)  NOT NULL UNIQUE,            -- número de documento de identidad (único por persona)
    name                VARCHAR(100) NOT NULL,                    -- nombre completo del usuario
    email               VARCHAR(100) NOT NULL UNIQUE,            -- correo electrónico usado para el login
    password            VARCHAR(255) NULL,                       -- hash bcrypt (NULL si admin creó sin contraseña inicial)
    role                VARCHAR(20)  NOT NULL DEFAULT 'user',     -- rol primario: define la vista SPA activa
    is_active           TINYINT(1)   NOT NULL DEFAULT 1,          -- 1=activo, 0=desactivado manualmente por admin
    deactivation_reason TEXT         NULL     DEFAULT NULL,       -- motivo de desactivación (para auditoría)
    deactivation_date   TIMESTAMP    NULL     DEFAULT NULL,       -- fecha en que se desactivó la cuenta
    deleted_at          TIMESTAMP    NULL     DEFAULT NULL,       -- soft delete: NULL=activo, timestamp=eliminado (recuperable 30 días)
    soft_delete_reason  TEXT         NULL     DEFAULT NULL,       -- motivo del soft delete (distinto de deactivation_reason)
    reactivation_date   TIMESTAMP    NULL     DEFAULT NULL,       -- fecha de la última reactivación después de desactivación
    created_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);

-- ── TABLA: user_roles ─────────────────────────────────────────
-- Tabla pivote N:M entre usuarios y roles (Tercera Forma Normal).
-- Registra TODOS los roles de un usuario: rol primario + cualquier rol adicional.
-- Un usuario puede tener: rol primario 'auditor' + rol adicional 'instructor' simultáneamente.
-- La PK compuesta (user_id, role_id) garantiza que no se duplique la misma combinación.
-- Al eliminar un usuario → sus entradas aquí se eliminan en cascada.
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,  -- FK al usuario que tiene el rol
    role_id INT NOT NULL,  -- FK al rol asignado al usuario

    PRIMARY KEY (user_id, role_id),  -- PK compuesta: un usuario no puede tener el mismo rol dos veces

    CONSTRAINT fk_ur_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_ur_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ── TABLA: user_extra_permissions ─────────────────────────────
-- Almacena los permisos individuales que el admin seleccionó para un usuario
-- al asignarle un rol adicional via el modal "Gestionar Rol".
-- Importante: NO se otorgan todos los permisos del rol adicional automáticamente.
-- El admin elige exactamente cuáles permisos del rol adicional quiere dar via checkboxes.
-- Ejemplo: rol adicional 'instructor' tiene 10 permisos → admin selecciona solo 2 (calendar.create, tasks.grade)
--   → solo esos 2 se guardan aquí → el JWT solo incluye esos 2 del rol adicional.
-- `rol_origen_id`: registra de qué rol adicional proviene el permiso (NULL = legacy pre-migración).
--   Permite al frontend identificar el color del borde ::before del item en el sidebar.
CREATE TABLE IF NOT EXISTS user_extra_permissions (
    id            INT NOT NULL AUTO_INCREMENT,
    user_id       INT NOT NULL,              -- FK al usuario que recibe el permiso extra
    permission_id INT NOT NULL,              -- FK al permiso específico seleccionado del rol adicional
    rol_origen_id INT NULL DEFAULT NULL,     -- FK al rol del que proviene este permiso (NULL por compatibilidad)

    PRIMARY KEY (id),

    UNIQUE KEY uq_uep_user_perm (user_id, permission_id),  -- un usuario no puede tener el mismo permiso extra dos veces

    INDEX idx_uep_user (user_id),

    CONSTRAINT fk_uep_user     FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
    CONSTRAINT fk_uep_perm     FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    CONSTRAINT fk_uep_rol_orig FOREIGN KEY (rol_origen_id) REFERENCES roles(id)       ON DELETE SET NULL
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  BLOQUE 3 — Tareas, asignaciones y comentarios              ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── TABLA: tasks ──────────────────────────────────────────────
-- Almacena las tareas del sistema creadas por instructores o admins.
-- Los usuarios asignados se gestionan en task_users (tabla pivote normalizada).
-- Ciclo de vida del campo `status`:
--   pendiente → en_progreso → pendiente_aprobacion → completada | reprobada
-- `grade`: nota 0.00 a 100.00 asignada por el instructor (NULL = sin calificar aún).
-- `grade_reason`: justificación de la nota asignada (comentario del instructor al calificar).
CREATE TABLE IF NOT EXISTS tasks (
    id           INT          NOT NULL AUTO_INCREMENT,
    title        VARCHAR(200) NOT NULL,                       -- título descriptivo de la tarea
    description  TEXT         NULL,                           -- descripción detallada con instrucciones
    status       VARCHAR(30)  NOT NULL DEFAULT 'pendiente',   -- estado actual: pendiente | en_progreso | pendiente_aprobacion | completada | reprobada
    comment      TEXT         NULL,                           -- comentario general de la tarea (visible a todos)
    grade        DECIMAL(5,2) NULL     DEFAULT NULL,          -- nota asignada (0.00 a 100.00); NULL = sin calificar
    grade_reason TEXT         NULL     DEFAULT NULL,          -- justificación de la calificación del instructor
    change_reason TEXT        NULL     DEFAULT NULL,          -- justificación cuando el instructor cambia estado sin calificar
    created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id)
);

-- ── TABLA: task_users ─────────────────────────────────────────
-- Tabla pivote N:M entre tareas y usuarios asignados (Tercera Forma Normal).
-- Una tarea puede asignarse a varios estudiantes; un estudiante puede tener varias tareas.
-- `user_name_snapshot`: preserva el nombre del estudiante en el historial aunque
--   la cuenta sea eliminada forzosamente (el snapshot no se borra).
-- `user_id`: puede quedar NULL si el usuario fue eliminado forzosamente (ON DELETE SET NULL).
--   Esto permite mantener la asignación en el historial sin referencia rota.
CREATE TABLE IF NOT EXISTS task_users (
    id                 INT          NOT NULL AUTO_INCREMENT,
    task_id            INT          NOT NULL,                     -- FK a la tarea asignada
    user_id            INT          NULL,                         -- FK al estudiante (NULL si fue eliminado forzosamente)
    user_name_snapshot VARCHAR(100) NOT NULL,                     -- nombre del estudiante preservado para historial
    assigned_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,    -- fecha en que se realizó la asignación

    PRIMARY KEY (id),

    INDEX idx_tu_task (task_id),  -- índice para búsquedas por tarea
    INDEX idx_tu_user (user_id),  -- índice para búsquedas por usuario

    CONSTRAINT fk_tu_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ── TABLA: task_comments ─────────────────────────────────────
-- Comentarios threaded (anidados) sobre tareas calificadas.
-- Semántica del campo `tipo`:
--   'comentario': escrito por el estudiante asignado (puede preguntar sobre la calificación)
--   'respuesta':  escrito por instructor o admin en respuesta a un comentario
-- `parent_id`: FK autorreferente — NULL = comentario raíz; valor = es respuesta a ese comentario.
-- `user_name_snapshot`: preserva el nombre del autor aunque la cuenta sea eliminada.
CREATE TABLE IF NOT EXISTS task_comments (
    id                 INT                             NOT NULL AUTO_INCREMENT,
    task_id            INT                             NOT NULL,
    user_id            INT                             NULL,                   -- FK al autor (NULL si cuenta eliminada)
    user_name_snapshot VARCHAR(100)                    NOT NULL,               -- nombre del autor preservado para historial
    tipo               ENUM('comentario','respuesta')  NOT NULL DEFAULT 'comentario', -- tipo de comentario
    parent_id          INT                             NULL     DEFAULT NULL,  -- NULL = raíz; valor = respuesta a ese comentario
    comentario         TEXT                            NOT NULL,               -- contenido del comentario
    created_at         TIMESTAMP                       DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_tc_task   (task_id),    -- índice para cargar todos los comentarios de una tarea
    INDEX idx_tc_user   (user_id),    -- índice para buscar comentarios por autor
    INDEX idx_tc_parent (parent_id),  -- índice para cargar respuestas de un comentario raíz

    CONSTRAINT fk_tc_task   FOREIGN KEY (task_id)   REFERENCES tasks(id)         ON DELETE CASCADE,
    CONSTRAINT fk_tc_user   FOREIGN KEY (user_id)   REFERENCES users(id)         ON DELETE SET NULL,
    CONSTRAINT fk_tc_parent FOREIGN KEY (parent_id) REFERENCES task_comments(id) ON DELETE CASCADE
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  BLOQUE 4 — Calendario y notas personales                   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── TABLA: calendar_events ───────────────────────────────────
-- Eventos del calendario creados por instructores (o usuarios con calendar.create).
-- Tipos de evento (campo `tipo`):
--   'propio':      recordatorio personal del instructor — solo él lo ve
--   'estudiante':  evento asignado a un estudiante específico — ambos lo ven
-- Comportamiento al eliminar relaciones:
--   Si se elimina el instructor → sus eventos se eliminan en cascada (CASCADE)
--   Si se elimina el estudiante → student_id queda NULL (SET NULL), el evento persiste
--   Si se elimina la tarea relacionada → task_id queda NULL (SET NULL), el evento persiste
CREATE TABLE IF NOT EXISTS calendar_events (
    id             INT          NOT NULL AUTO_INCREMENT,
    instructor_id  INT          NOT NULL,                      -- FK al instructor que creó el evento
    student_id     INT          NULL     DEFAULT NULL,         -- FK al estudiante destinatario (NULL si tipo='propio')
    task_id        INT          NULL     DEFAULT NULL,         -- FK a la tarea relacionada (opcional)
    date           DATE         NOT NULL,                      -- fecha del evento (solo fecha, sin hora)
    title          VARCHAR(200) NOT NULL,                      -- título del evento en el calendario
    color          VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',    -- color hex del punto/marcador del evento
    tipo           VARCHAR(20)  NOT NULL DEFAULT 'propio',     -- 'propio' | 'estudiante'
    created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_calendar_instructor_date (instructor_id, date),  -- índice compuesto para cargar eventos por instructor y mes
    INDEX idx_calendar_student_date    (student_id, date),     -- índice compuesto para cargar eventos por estudiante y mes

    CONSTRAINT fk_calendar_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_calendar_student    FOREIGN KEY (student_id)    REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_calendar_task       FOREIGN KEY (task_id)       REFERENCES tasks(id) ON DELETE SET NULL
);

-- ── TABLA: user_notes ────────────────────────────────────────
-- Notas personales tipo post-it del estudiante (permiso: notes.create).
-- Solo el propio estudiante puede ver y gestionar sus notas.
-- Al eliminar el usuario → todas sus notas se eliminan en cascada.
CREATE TABLE IF NOT EXISTS user_notes (
    id         INT         NOT NULL AUTO_INCREMENT,
    user_id    INT         NOT NULL,                         -- FK al estudiante propietario de la nota
    texto      TEXT        NOT NULL,                         -- contenido del post-it
    color      VARCHAR(20) NOT NULL DEFAULT '#fef3c7',       -- color de fondo del post-it (hex)
    created_at TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_user_notes_user (user_id),

    CONSTRAINT fk_user_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  BLOQUE 5 — Notificaciones de cambio de estado de tareas    ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── TABLA: task_state_notifications ──────────────────────────
-- Registra cada vez que un instructor cambia el estado de una tarea con justificación.
-- Dos casos posibles:
--   a) resetGrade: true  → el instructor reinicia la calificación; la nota y grade_reason se limpian.
--   b) changeReason (sin resetGrade) → el instructor solo cambia el estado sin modificar la nota.
-- En ambos casos el instructor provee una justificación obligatoria y los estudiantes
-- asignados a la tarea reciben la notificación (tabla de destinatarios abajo).
CREATE TABLE IF NOT EXISTS task_state_notifications (
    id            INT       NOT NULL AUTO_INCREMENT,
    task_id       INT       NOT NULL,  -- FK a la tarea cuyo estado fue modificado
    instructor_id INT       NOT NULL,  -- FK al instructor que realizó el cambio
    justificacion TEXT      NOT NULL,  -- razón obligatoria del cambio de estado sin calificar
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_tsn_task       (task_id),       -- índice para buscar notificaciones de una tarea
    INDEX idx_tsn_instructor (instructor_id), -- índice para buscar notificaciones por instructor

    CONSTRAINT fk_tsn_task       FOREIGN KEY (task_id)       REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsn_instructor FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── TABLA: task_state_notification_recipients ─────────────────
-- Tabla pivote entre notificaciones de estado y los estudiantes que deben recibirlas.
-- Se crea un registro por cada estudiante asignado a la tarea en el momento del cambio.
-- `leida`: 0 = la notificación aún no fue vista (badge rojo en el panel del estudiante);
--          1 = el estudiante la marcó como leída (sin badge).
-- UNIQUE(notification_id, user_id): garantiza que un estudiante no reciba
--   la misma notificación dos veces aunque la lógica se ejecute más de una vez.
CREATE TABLE IF NOT EXISTS task_state_notification_recipients (
    id              INT        NOT NULL AUTO_INCREMENT,
    notification_id INT        NOT NULL,            -- FK a task_state_notifications
    user_id         INT        NOT NULL,            -- FK al estudiante que recibe la notificación
    leida           TINYINT(1) NOT NULL DEFAULT 0,  -- 0=no leída, 1=leída por el estudiante

    PRIMARY KEY (id),

    UNIQUE KEY uq_tsnr (notification_id, user_id),  -- evita enviar la misma notificación dos veces al mismo estudiante

    INDEX idx_tsnr_user (user_id),  -- índice para cargar todas las notificaciones de un estudiante

    CONSTRAINT fk_tsnr_notif FOREIGN KEY (notification_id) REFERENCES task_state_notifications(id) ON DELETE CASCADE,
    CONSTRAINT fk_tsnr_user  FOREIGN KEY (user_id)         REFERENCES users(id)                    ON DELETE CASCADE
);

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  BLOQUE 6 — Módulo Comunicador: anuncios y notificaciones   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ── TABLA: comunicador_anuncios ───────────────────────────────
-- Anuncios globales creados por usuarios con el permiso 'comunicador.anuncios'.
-- Son broadcasts públicos: TODOS los roles autenticados los ven en su sección
-- de notificaciones, sin importar su rol primario.
-- A diferencia de las notificaciones del comunicador, los anuncios NO tienen
-- marca de leído porque son mensajes globales (no personalizados por rol).
CREATE TABLE IF NOT EXISTS comunicador_anuncios (
    id         INT          NOT NULL AUTO_INCREMENT,
    autor_id   INT          NOT NULL,                      -- FK al usuario que creó el anuncio
    titulo     VARCHAR(200) NOT NULL,                      -- título del anuncio (visible en la lista)
    contenido  TEXT         NOT NULL,                      -- cuerpo completo del anuncio
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_anuncios_autor (autor_id),  -- índice para buscar anuncios por su autor

    CONSTRAINT fk_anuncios_autor FOREIGN KEY (autor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── TABLA: comunicador_notificaciones ────────────────────────
-- Notificaciones personalizadas creadas por usuarios con 'comunicador.notificaciones'.
-- A diferencia de los anuncios, las notificaciones tienen roles destino específicos:
-- solo los usuarios cuyo rol primario esté en `comunicador_notificaciones_roles` las ven.
-- Las lecturas individuales por usuario se registran en `comunicador_notificaciones_leidas`.
-- DISEÑO 3FN: NO hay columna JSON roles_destino — los roles se normalizan en tabla pivote.
CREATE TABLE IF NOT EXISTS comunicador_notificaciones (
    id         INT          NOT NULL AUTO_INCREMENT,
    autor_id   INT          NOT NULL,    -- FK al usuario que creó la notificación
    titulo     VARCHAR(200) NOT NULL,    -- título de la notificación
    contenido  TEXT         NOT NULL,    -- cuerpo de la notificación
    created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    INDEX idx_com_notif_autor (autor_id),

    CONSTRAINT fk_com_notif_autor FOREIGN KEY (autor_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── TABLA: comunicador_notificaciones_roles ───────────────────
-- Tabla pivote N:M entre notificaciones del comunicador y roles destinatarios (3FN).
-- REEMPLAZA la columna JSON `roles_destino` que existía antes.
-- Por qué tabla pivote y no JSON: almacenar una lista de IDs en una columna JSON
-- viola la Primera Forma Normal (1FN) — cada valor debe estar en su propia fila.
-- Esto también permite usar JOINs eficientes para filtrar notificaciones por rol.
-- UNIQUE(notificacion_id, role_id): garantiza que el mismo rol no aparezca
--   dos veces como destinatario de la misma notificación.
CREATE TABLE IF NOT EXISTS comunicador_notificaciones_roles (
    id              INT NOT NULL AUTO_INCREMENT,
    notificacion_id INT NOT NULL,  -- FK a comunicador_notificaciones
    role_id         INT NOT NULL,  -- FK al rol que debe recibir esta notificación

    PRIMARY KEY (id),

    UNIQUE KEY uq_cnr (notificacion_id, role_id),  -- un rol no puede ser destinatario dos veces de la misma notif

    INDEX idx_cnr_notif (notificacion_id),  -- índice para cargar roles de una notificación
    INDEX idx_cnr_role  (role_id),          -- índice para buscar notificaciones por rol

    CONSTRAINT fk_cnr_notif FOREIGN KEY (notificacion_id) REFERENCES comunicador_notificaciones(id) ON DELETE CASCADE,
    CONSTRAINT fk_cnr_role  FOREIGN KEY (role_id)         REFERENCES roles(id)                      ON DELETE CASCADE
);

-- ── TABLA: comunicador_notificaciones_leidas ──────────────────
-- Registra qué usuarios ya leyeron cada notificación del comunicador.
-- La ausencia de un registro = notificación NO leída por ese usuario.
-- La presencia de un registro = el usuario la marcó como leída en esa fecha.
-- UNIQUE(notificacion_id, user_id): garantiza que un usuario no pueda
--   registrar "leída" dos veces para la misma notificación.
-- Al eliminar la notificación → las lecturas se eliminan en cascada.
-- Al eliminar el usuario → sus registros de lectura se eliminan en cascada.
CREATE TABLE IF NOT EXISTS comunicador_notificaciones_leidas (
    id              INT       NOT NULL AUTO_INCREMENT,
    notificacion_id INT       NOT NULL,   -- FK a comunicador_notificaciones
    user_id         INT       NOT NULL,   -- FK al usuario que marcó como leída
    leida_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- momento exacto en que la marcó como leída

    PRIMARY KEY (id),

    UNIQUE KEY uq_cnl (notificacion_id, user_id),  -- un usuario no puede marcar la misma notif leída dos veces

    INDEX idx_cnl_user (user_id),  -- índice para cargar todas las lecturas de un usuario

    CONSTRAINT fk_cnl_notif FOREIGN KEY (notificacion_id) REFERENCES comunicador_notificaciones(id) ON DELETE CASCADE,
    CONSTRAINT fk_cnl_user  FOREIGN KEY (user_id)         REFERENCES users(id)                      ON DELETE CASCADE
);

-- ============================================================
-- GLOSARIO DE COMANDOS SQL USADOS EN ESTE ARCHIVO
-- ============================================================
-- USE bd                         → selecciona la base de datos activa para las siguientes operaciones
-- CREATE TABLE IF NOT EXISTS     → crea la tabla solo si no existe (idempotente: seguro re-ejecutar)
-- INT                            → número entero (IDs, contadores, flags booleanos 0/1)
-- VARCHAR(n)                     → texto de longitud variable hasta n caracteres
-- TEXT                           → texto largo sin límite fijo (contenido, justificaciones, descripciones)
-- DECIMAL(5,2)                   → número con decimales exactos (notas: 0.00 a 999.99)
-- TINYINT(1)                     → entero pequeño (0 a 127) usado como booleano: 0=falso, 1=verdadero
-- TIMESTAMP                      → fecha + hora almacenada en UTC (created_at, updated_at, leida_at)
-- DATE                           → solo fecha sin hora (eventos del calendario: '2026-05-21')
-- NOT NULL                       → columna obligatoria: rechaza NULL al insertar o actualizar
-- NULL                           → columna opcional: acepta NULL al insertar o actualizar
-- DEFAULT valor                  → valor automático si no se especifica en el INSERT
-- DEFAULT CURRENT_TIMESTAMP      → toma la fecha/hora del servidor al momento del INSERT
-- ON UPDATE CURRENT_TIMESTAMP    → se actualiza automáticamente cada vez que se modifica la fila
-- UNIQUE                         → no permite valores duplicados en esa columna
-- UNIQUE KEY nombre (c1, c2)     → restricción única sobre una combinación de columnas (compuesta)
-- AUTO_INCREMENT                 → el valor del campo se incrementa automáticamente con cada INSERT
-- PRIMARY KEY (col)              → clave primaria: identifica unívocamente cada fila (implica NOT NULL + UNIQUE)
-- INDEX nombre (col1, col2)      → índice que acelera búsquedas SELECT por esas columnas (no implica unicidad)
-- FOREIGN KEY (col) REFERENCES   → vincula esta columna a la PK de otra tabla (integridad referencial)
-- ON DELETE CASCADE              → al borrar la fila padre, las filas hijas se borran también
-- ON DELETE SET NULL             → al borrar la fila padre, la FK de los hijos queda en NULL
-- CONSTRAINT nombre              → nombre explícito para una FK o restricción (facilita depuración)
-- ENUM('v1','v2')                → columna que solo acepta los valores listados (seguro contra errores de tipeo)
