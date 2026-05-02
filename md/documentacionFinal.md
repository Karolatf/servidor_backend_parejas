# Documentación Final — Sistema de Gestión de Tareas

**Institución:** SENA — Técnico en Programación de Software — Código 3233198  
**Equipo:** Karol Nicolle Torres Fuentes (Líder) | Juan Sebastián Patiño Hernández (Desarrollador)  
**Fecha:** 2026

---

## 1. Descripción General del Sistema

El Sistema de Gestión de Tareas es una aplicación web full-stack que permite administrar tareas académicas dentro del contexto del SENA. Resuelve el problema de seguimiento manual de asignaciones entre instructores y estudiantes, proporcionando un panel centralizado con roles diferenciados.

**Usuarios objetivo:**
- Administradores: gestión total del sistema (usuarios, tareas, roles)
- Instructores: creación y calificación de tareas de sus estudiantes
- Estudiantes: visualización y actualización de sus propias tareas

**Contexto:** desarrollado como proyecto integrador del Técnico en Programación de Software, aplicando arquitectura MVC, autenticación JWT y control de acceso por roles (RBAC).

---

## 2. Arquitectura del Sistema

### Frontend (`transferencia_dom_parejas`)

```
index.html (punto de entrada único)
    └── src/main.js (DOMContentLoaded — inicialización)
            ├── src/ui/modoUI.js        (activación de vistas y eventos)
            ├── src/ui/tareasUI.js      (construcción DOM de tabla de tareas)
            ├── src/services/tareasService.js  (coordinación de flujos)
            ├── src/api/tareasApi.js    (fetch hacia /api/tasks)
            ├── src/api/usuariosApi.js  (fetch hacia /api/users)
            ├── src/api/authApi.js      (fetch hacia /api/auth)
            └── src/utils/
                    ├── fetchConAuth.js     (interceptor JWT + Silent Refresh)
                    ├── sesion.js           (CRUD de localStorage)
                    ├── notificaciones.js   (SweetAlert2 centralizado)
                    ├── validaciones.js     (validación de formularios)
                    ├── auditoria.js        (línea de tiempo en memoria)
                    ├── rolesPermisos.js    (diccionario RBAC frontend)
                    └── eventosCalendario.js (calendario reutilizable)
```

### Backend (`servidor_backend_parejas`)

```
src/app.js (Express — registra rutas y middlewares)
    └── src/routes/
            ├── auth.routes.js      (POST /login, /register, /refresh)
            ├── users.routes.js     (CRUD de usuarios + deactivate/reactivate)
            └── tasks.routes.js     (CRUD de tareas + assign + filter)
    ├── src/controller/
    ├── src/services/
    ├── src/models/         (queries MySQL con pool)
    ├── src/middlewares/    (verifyToken, requireAdmin, checkPermission, errorHandler)
    └── src/utils/          (catchAsync, response.util, fetchConAuth)
```

### Flujo de datos

```
Usuario (evento DOM)
    → modoUI.js / tareasService.js
    → api/*.js
    → fetchConAuth.js (agrega Authorization: Bearer <token>)
    → Express → routes → controller → service → model → MySQL
    ← response.util (formato { success, message, data })
    → UI actualiza el DOM
```

---

## 3. Flujo de Autenticación JWT

### Registro (`POST /api/auth/register`)
1. El usuario completa el formulario en la pantalla de inicio
2. El frontend llama `authApi.registrar({ name, documento, email, password })`
3. El backend valida con Zod (registerSchema), hashea la contraseña con bcrypt (10 rounds) y la guarda en MySQL con `role = 'user'`
4. Respuesta: 201 con el usuario creado (sin campo password)

### Login (`POST /api/auth/login`)
1. El usuario ingresa email y password
2. El backend busca el usuario por email, verifica bcrypt, confirma `is_active = 1`
3. Si es correcto: genera `accessToken` (JWT, 1h) y `refreshToken` (JWT, 7d)
4. El frontend guarda ambos tokens en localStorage vía `sesion.js`

### Access Token
- Payload: `{ id, documento, role }`
- Duración: 1 hora
- Se adjunta en el header `Authorization: Bearer <token>` en cada petición protegida
- Lo agrega automáticamente `fetchConAuth.js` — el resto del código no lo gestiona

### Refresh Token (Silent Refresh)
- Duración: 7 días
- Cuando una petición recibe 401, `fetchConAuth.js` llama a `POST /api/auth/refresh` con el refreshToken
- Si la renovación es exitosa, se reintenta la petición original con el nuevo accessToken
- Si el refreshToken también expiró: se hace logout automático y se redirige al login

### Logout
1. Se eliminan accessToken y refreshToken de localStorage (`sesion.limpiarSesion()`)
2. Se cambia el modo del body a "inicio"
3. El backend no mantiene estado de sesión (los JWT son stateless)

---

## 4. Roles y Permisos RBAC

| Permiso | Admin | Instructor | Estudiante |
|---------|:-----:|:----------:|:----------:|
| tasks.create | ✓ | ✓ | — |
| tasks.view.all | ✓ | ✓ | ✓ |
| tasks.update | ✓ | ✓ | — |
| tasks.delete.all | ✓ | ✓ | — |
| tasks.assign | ✓ | ✓ | — |
| tasks.status.update | ✓ | — | ✓ |
| users.view | ✓ | ✓ | — |
| users.edit | ✓ | — | — |
| users.delete | ✓ | — | — |
| users.assign.role | ✓ | — | — |

### Cómo funciona `checkPermission(permiso)`

El middleware `authorization.middleware.js` recibe el código del permiso requerido y retorna una función middleware que:
1. Lee `req.usuario.id` (adjuntado por `verifyToken`)
2. Consulta la BD con `getUserRolesAndPermissions(userId)` — no usa el JWT para esto
3. Usa `.some()` para verificar si AL MENOS UN rol del usuario incluye el permiso
4. Si ningún rol lo tiene: responde 403 Forbidden

---

## 5. Endpoints REST

| Método | Ruta | Descripción | Rol requerido |
|--------|------|-------------|---------------|
| POST | /api/auth/login | Iniciar sesión | Público |
| POST | /api/auth/register | Registrar usuario | Público |
| POST | /api/auth/refresh | Renovar accessToken | Público (refreshToken) |
| GET | /api/users | Listar todos los usuarios | admin, instructor |
| GET | /api/users/:id | Obtener usuario por ID | admin |
| POST | /api/users | Crear usuario | admin |
| PUT | /api/users/:id | Actualizar usuario | admin |
| DELETE | /api/users/:id | Eliminar usuario | admin |
| PATCH | /api/users/:id/deactivate | Desactivar usuario | admin |
| PATCH | /api/users/:id/reactivate | Reactivar usuario | admin |
| PATCH | /api/users/:id/role | Cambiar rol | admin |
| GET | /api/tasks | Listar todas las tareas | autenticado |
| GET | /api/tasks/filter | Filtrar tareas por estado/usuario | autenticado |
| GET | /api/tasks/dashboard | Estadísticas del dashboard | autenticado |
| GET | /api/tasks/:id | Obtener tarea por ID | autenticado |
| POST | /api/tasks | Crear tarea | tasks.create |
| PUT | /api/tasks/:id | Actualizar tarea | tasks.update |
| DELETE | /api/tasks/:id | Eliminar tarea | tasks.delete.all |
| PATCH | /api/tasks/:id/status | Cambiar estado de tarea | tasks.status.update |
| POST | /api/tasks/:taskId/assign | Asignar usuarios a tarea | tasks.assign |

---

## 6. Estructura de la Base de Datos

### Tabla `users`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT PK | Identificador interno |
| name | VARCHAR(100) | Nombre completo |
| documento | VARCHAR(20) UNIQUE | Número de documento |
| email | VARCHAR(100) UNIQUE | Correo electrónico |
| password | VARCHAR(255) | Hash bcrypt |
| role | ENUM('admin','instructor','user') | Rol legacy (compatibilidad) |
| is_active | TINYINT(1) DEFAULT 1 | 1=activo, 0=desactivado |

### Tabla `tasks`
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | INT AUTO_INCREMENT PK | Identificador de la tarea |
| title | VARCHAR(200) | Título de la tarea |
| description | TEXT | Descripción (opcional) |
| status | ENUM('pendiente','en_progreso','completada','pendiente_aprobacion') | Estado actual |
| comment | VARCHAR(500) | Comentario del instructor (opcional) |
| assigned_users | JSON | Array de IDs de usuarios asignados |

### Tablas RBAC
- `roles`: id, name (admin, instructor, user)
- `permissions`: id, code (ej: 'tasks.create'), description
- `role_permissions`: role_id FK→roles, permission_id FK→permissions (ON DELETE RESTRICT)
- `user_roles`: user_id FK→users, role_id FK→roles (ON DELETE RESTRICT)

---

## 7. Instalación y Ejecución

### Requisitos previos
- Node.js 18+
- MySQL 8.0
- MySQL Workbench 8.0 CE
- Git

### Paso a paso desde cero

**1. Clonar los repositorios**
```bash
git clone <URL_FRONTEND> transferencia_dom_parejas
git clone <URL_BACKEND> servidor_backend_parejas
```

**2. Configurar el backend**
```bash
cd servidor_backend_parejas
npm install
```

**3. Crear el archivo .env** (nunca subir a GitHub)
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=app_user
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=gestion_tareas_sena
JWT_SECRET=cadena_larga_aleatoria_para_access_token
JWT_REFRESH_SECRET=cadena_diferente_para_refresh_token
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

**4. Configurar MySQL** (abrir MySQL Workbench con root)
```sql
-- Ejecutar database/connection.sql con conexión root
-- Luego ejecutar database/schema.sql con conexión app_user
-- Luego ejecutar database/rbac.sql con conexión app_user
```

**5. Iniciar el backend**
```bash
npm run dev
# Servidor en http://localhost:3000
```

**6. Configurar e iniciar el frontend**
```bash
cd ../transferencia_dom_parejas
npm install
npm run dev
# Frontend en http://localhost:5173
```

---

## 8. Glosario Técnico

| Término | Definición |
|---------|------------|
| **JWT** | JSON Web Token — formato compacto para transmitir información segura entre cliente y servidor. Firmado con una clave secreta. |
| **bcrypt** | Algoritmo de hashing para contraseñas. Agrega "sal" aleatoria al hash para proteger contra ataques de diccionario. |
| **RBAC** | Role-Based Access Control — control de acceso basado en roles. Un usuario tiene roles y los roles tienen permisos. |
| **ES Modules** | Sistema de módulos nativo de JavaScript con `import`/`export`. Permite dividir el código en archivos independientes. |
| **Vite** | Empaquetador de frontend de alto rendimiento. Sirve los módulos en desarrollo sin compilar y hace build optimizado para producción. |
| **SweetAlert2** | Librería para mostrar diálogos y notificaciones elegantes reemplazando los `alert()`, `confirm()` y `prompt()` nativos del navegador. |
| **fetchConAuth** | Módulo del frontend que intercepta todas las peticiones al backend, agrega el token JWT y gestiona el Silent Refresh automáticamente. |
| **Silent Refresh** | Técnica que renueva el accessToken de forma transparente cuando expira, sin que el usuario tenga que volver a iniciar sesión. |