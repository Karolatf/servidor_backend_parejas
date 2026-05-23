# Guía de Inicio — Configuración y Arranque del Proyecto (Backend)

> Sigue este orden exacto antes de empezar la presentación.
> Si saltás un paso, el backend o el frontend no van a funcionar.

---

## PASO 1 — Clonar los repositorios

```bash
# Clonar el backend
git clone https://github.com/TU_USUARIO/servidor_backend_parejas.git
cd servidor_backend_parejas

# En otra terminal, clonar el frontend
git clone https://github.com/TU_USUARIO/transferencia_dom.git
cd transferencia_dom
```

---

## PASO 2 — Instalar dependencias

```bash
# En la carpeta del backend
cd servidor_backend_parejas
npm install

# En la carpeta del frontend
cd transferencia_dom
npm install
```

> Dependencias del backend: Express, mysql2, jsonwebtoken, bcryptjs, zod, nodemailer, dotenv, cors, nodemon.

---

## PASO 3 — Configurar el archivo `.env` del backend

En la carpeta raíz del backend, crear el archivo `.env`:

```env
# ── Base de datos ─────────────────────────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=TORRES_2007
DB_NAME=gestion_tareas_sena

# ── JWT ──────────────────────────────────────────────────────────────────────
JWT_SECRET=SENA_JWT_SECRET_GESTION_TAREAS_2026
JWT_REFRESH_SECRET=SENA_REFRESH_SECRET_GESTION_TAREAS_2026
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# ── Mailtrap SMTP (Email Testing) ─────────────────────────────────────────────
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=13054261a74697
MAILTRAP_PASS=664f3a62c35007
MAILTRAP_FROM=noreply@taskapp.sena.edu.co

# ── Puerto del servidor ────────────────────────────────────────────────────────
PORT=3000
# NOTA EXPOSICIÓN: el servidor escucha en 0.0.0.0:3000 (app.js ya tiene el 0.0.0.0)
# Esto permite que otros dispositivos en la misma red se conecten al backend
# Usar con: http://192.168.X.X:3000 desde el frontend (cambiar en config.js del frontend)
```

> El archivo `.env` está en `.gitignore` — nunca se sube al repositorio. Hay que crearlo manualmente en cada máquina.

---

## PASO 4 — Configurar MySQL

### 4.1 — Contraseña root en el SENA

```
#Aprendiz2024
```

### 4.2 — Crear el usuario `app_user` desde la conexión root

Abrir MySQL Workbench, conectarse con `root`, y ejecutar `database/connection.sql`:

```sql
CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'TORRES_2007';
GRANT ALL PRIVILEGES ON gestion_tareas_sena.* TO 'app_user'@'localhost';
FLUSH PRIVILEGES;
```

### 4.3 — Crear una nueva conexión como `app_user` en MySQL Workbench

| Campo | Valor |
|---|---|
| Connection Name | app_user |
| Hostname | localhost |
| Port | 3306 |
| Username | app_user |
| Password | TORRES_2007 |

### 4.4 — Crear las tablas del sistema (como `app_user`)

Conectarse como `app_user` y ejecutar los scripts en este orden exacto:

1. **`database/schema.sql`** — crea la base de datos `gestion_tareas_sena` y todas las tablas:
   - RBAC: `roles`, `permissions`, `role_permissions`, `user_roles`, `user_extra_permissions`
   - Usuarios: `users` (con soft delete)
   - Tareas: `tasks`, `task_users`, `task_comments`, `task_state_notifications`, `task_state_notification_recipients`
   - Calendario: `calendar_events`, `user_notes`
   - Comunicador: `comunicador_anuncios`, `comunicador_notificaciones`, `comunicador_notificaciones_roles`, `comunicador_notificaciones_leidas`

2. **`database/seed.sql`** — inserta los 6 roles, todos los permisos, y los asigna a sus roles en `role_permissions`.

> **Importante:** ejecutar `schema.sql` SIEMPRE antes que `seed.sql`. Si `schema.sql` ya se ejecutó y las tablas existen, es seguro re-ejecutarlo (`IF NOT EXISTS` lo protege).

---

## PASO 5 — Promover usuarios a admin (después del primer registro)

Después de que Karol y Sebastián se registren desde el navegador:

```sql
-- 1. Cambiar el rol primario a admin
UPDATE users
SET role = 'admin'
WHERE documento IN ('1097497001', '1234567002');

-- 2. Quitar el rol 'user' de user_roles
DELETE ur
FROM user_roles ur
INNER JOIN users u ON u.id = ur.user_id
INNER JOIN roles r ON r.id = ur.role_id
WHERE u.documento IN ('1097497001', '1234567002')
  AND r.name = 'user';

-- 3. Agregar el rol 'admin' a user_roles
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.documento IN ('1097497001', '1234567002')
  AND r.name = 'admin';
```

---

## PASO 6 — Datos de prueba

Registrar desde el navegador (o insertar manualmente):
- 1 usuario `instructor` (cualquier correo y documento)
- 2 usuarios `user` (estudiantes)

Desde el panel de admin, crear tareas en varios estados y asignarlas a los estudiantes.

Para la demo de roles adicionales:
- En el panel de admin, ir a la tabla de usuarios → "Gestionar Rol" de un usuario
- Asignar un rol adicional (ej: `auditor`) con el permiso `auditor.reportes`
- Iniciar sesión con ese usuario para ver la sección extra en el sidebar

---

## PASO 7 — Importar la colección de Postman

1. Abrir Postman
2. Clic en **Import**
3. Importar el archivo `.json` de la colección (está en `postman/`)
4. Importar también el archivo de **environment** con las variables `baseUrl` y `token`
5. Seleccionar el environment importado en el selector de Postman

---

## PASO 8 — Abrir los archivos de documentación

Antes de arrancar:

- Backend: `md/guia-exposicion.md` → seguir el guión
- Backend: `md/consultas-sql.md` → tener a mano las consultas de demostración
- Frontend: `md/pitch.md` → estudiar el gancho de apertura
- Frontend: `md/guia-exposicion.md` → seguir el guión completo

---

## PASO 9 — Arrancar los servidores

### Backend (terminal 1):
```bash
cd servidor_backend_parejas
npm run dev
```
Debe mostrar:
- `Servidor escuchando en http://localhost:3000`
- `Conexión con MySQL establecida correctamente`

### Frontend — Opción A Desarrollo (terminal 2):
```bash
cd transferencia_dom
npm run dev
# Abre http://localhost:5173
```

### Frontend — Opción B Producción con IP (terminal 2):
```bash
# Primero: editar src/utils/config.js → API_BASE_URL = 'http://192.168.X.X:3000'
cd transferencia_dom
npm run build
cd dist
npx serve -l 3001
# Abre http://192.168.X.X:3001 desde cualquier dispositivo de la red
```

---

## PASO 10 — Verificar antes de empezar

1. Abrir el navegador en la URL del frontend
2. Hacer login como admin — debe cargar el panel azul
3. Verificar la tabla de usuarios y tareas con datos de prueba
4. Si todo funciona → la presentación puede empezar

---

## Checklist rápido

- [ ] `.env` creado con los datos correctos
- [ ] Backend corriendo en puerto 3000 (ver consola)
- [ ] MySQL conectado (ver mensaje en consola del backend)
- [ ] Scripts `schema.sql` y `seed.sql` ejecutados en orden
- [ ] Usuarios de los 3 roles principales registrados (admin, instructor, estudiante)
- [ ] Tareas en varios estados (pendiente, en_progreso, pendiente_aprobacion, completada)
- [ ] Al menos 1 usuario con rol adicional para demo de secciones extra
- [ ] Postman con colección y environment listos
- [ ] Frontend corriendo (localhost:5173 o IP:3001)
- [ ] Documentación abierta en VSCode
