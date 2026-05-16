# Guía de Inicio — Configuración y Arranque del Proyecto

> Sigue este orden exacto antes de empezar la presentación.
> Si saltás un paso, el backend o el frontend no van a funcionar.

---

## PASO 1 — Clonar los repositorios

Abrir la terminal y ejecutar uno por uno:

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

En cada repositorio, ejecutar `npm install` (o `npm i`) para descargar todos los paquetes de `package.json`:

```bash
# En la carpeta del backend
cd servidor_backend_parejas
npm install

# En la carpeta del frontend
cd transferencia_dom
npm install
```

> Esto descarga: Express, mysql2, jsonwebtoken, bcryptjs, zod, nodemailer, dotenv, cors y nodemon en el backend. Y Vite en el frontend.

---

## PASO 3 — Configurar el archivo `.env` del backend

En la carpeta raíz del backend, crear el archivo `.env` con este contenido exacto:

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
```

> El archivo `.env` está en el `.gitignore` — nunca se sube al repositorio. Por eso hay que crearlo manualmente en cada máquina.

---

## PASO 4 — Configurar MySQL

### 4.1 — Contraseña root en el SENA

```
#Aprendiz2024
```

### 4.2 — Crear el usuario `app_user` desde la conexión root

Abrir MySQL Workbench y conectarse con el usuario `root`. Luego ejecutar el contenido del archivo `connection.sql` (está en la raíz del backend o en `docs/`). El script hace esto:

```sql
-- Crear el usuario de la aplicación
CREATE USER IF NOT EXISTS 'app_user'@'localhost' IDENTIFIED BY 'TORRES_2007';

-- Darle todos los permisos sobre la base de datos del proyecto
GRANT ALL PRIVILEGES ON gestion_tareas_sena.* TO 'app_user'@'localhost';

-- Aplicar los cambios de permisos
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

Conectarse como `app_user` y ejecutar los scripts en este orden:

1. **`schema.sql`** — crea la base de datos `gestion_tareas_sena` y todas las tablas: `users`, `tasks`, `calendar_events`, `user_notes`, `roles`, `permissions`, `user_roles`, `role_permissions`.

2. **`rbac.sql`** — inserta los roles (`admin`, `instructor`, `user`) y los permisos del sistema (`tasks.create`, `users.delete`, etc.) y los vincula con sus roles en `role_permissions`.

> Ejecutar `schema.sql` primero siempre. Si se ejecuta `rbac.sql` antes, fallará porque las tablas no existen todavía.

---

## PASO 5 — Cargar los datos de prueba en la base de datos

Ejecutar en MySQL Workbench (como `app_user`) el archivo de datos de prueba si existe (normalmente `seed.sql` o `data.sql`). Esto crea usuarios de los tres roles, tareas en varios estados y eventos de calendario listos para la demo.

Si no hay archivo de seed, crear manualmente al menos:
- 1 usuario `admin`
- 1 usuario `instructor`
- 2 usuarios `user` (estudiantes)
- Algunas tareas en estados `pendiente`, `en_progreso`, `pendiente_aprobacion`

---

## PASO 6 — Importar la colección y el entorno de Postman

1. Abrir Postman.
2. Hacer clic en **Import**.
3. Importar el archivo `.json` de la colección (está en la carpeta `docs/` o `postman/` del backend).
4. Importar también el archivo de **environment** (`.json`) que tiene las variables `baseUrl`, `token`, etc.
5. Seleccionar el environment importado en el selector de Postman (esquina superior derecha).

---

## PASO 7 — Abrir los archivos de documentación

Antes de arrancar:

- Backend: abrir `docs/04-exposicion/guia-exposicion.md`
- Frontend: abrir `md/guia-exposicion.md`
- Tener a mano `docs/04-exposicion/preguntas-frecuentes.md` por si el instructor pregunta algo

---

## PASO 8 — Arrancar los servidores

**Backend** (en su terminal):
```bash
cd servidor_backend_parejas
npm run dev
```
> Debe mostrar: `Servidor escuchando en http://localhost:3000` y `Conexión con MySQL establecida correctamente`

**Frontend** (en otra terminal):
```bash
cd transferencia_dom
npm run dev
```
> Debe mostrar: `VITE v5.x.x  ready in Xms → Local: http://localhost:5173`

---

## PASO 9 — Empezar la presentación

- Abrir el navegador en `http://localhost:5173`
- Cerrar sesión si hay alguna activa
- Seguir la `guia-exposicion.md` paso a paso

---

## Checklist rápido antes de empezar

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend corriendo en puerto 5173
- [ ] MySQL conectado (ver mensaje en consola del backend)
- [ ] Datos de prueba cargados (al menos 1 admin, 1 instructor, 2 estudiantes)
- [ ] Postman con la colección y el environment importados
- [ ] `.env` creado con los datos correctos
- [ ] Archivos de documentación abiertos en VSCode
