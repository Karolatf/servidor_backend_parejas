# servidor_backend_parejas · Software Factory SENA

Backend en Node.js con Express para el Sistema de Gestión de Tareas.
Desarrollado como parte de la guía *"Modelos y separación de responsabilidades"*
del Técnico en Programación de Software — SENA.

---

## Equipo

| Nombre           | Rol                | Usuario de GitHub |
| :--------------- | :----------------- | :---------------- |
| Karol Torres     | Líder (Arquitecto) | `@Karolatf`       |
| Sebastian Patiño | Desarrollador      | `@SebasPatino`    |
| Paulo Zapata     | Desarrollador      | `@Pauloz17`       |

---

## Centro de Documentación

Antes de escribir la primera línea de código, revisa las guías:

### Nivel 1 — Sistema (`docs/01-guia-sistema/`)
- `blindaje-ramas.md` — Configuración de Rulesets en GitHub
- `creacion_milestones.md` — Gestión de Hitos
- `creacion-issues.md` — Gestión de Issues
- `tablero-kanban.md` — Configuración del tablero Kanban

### Nivel 2 — Metodología (`docs/02-guia-metodologia/`)
- `gitflow.md` — Flujo de ramas y ciclo de vida del código
- `conventional-commits.md` — Estándar de mensajes de commit
- `GUIA_ISSUES.md` — Cómo usar las plantillas de Issues
- `GUIA_PULL_REQUEST.md` — Cómo pedir revisión de código

### Nivel 3 — Formatos (`docs/03-formatos-maestros/`)
- Plantillas oficiales de Issues y Pull Requests

---

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm install
```

## Ejecución

```bash
npm run dev
```

El servidor corre en: `http://localhost:3000`

---

## Arquitectura MVC

```
Cliente HTTP
    ↓
app.js (Express — registra rutas con prefijo /api)
    ↓
src/routes/ (userRoutes.js, taskRoutes.js — conectan URLs con controladores)
    ↓
src/controller/ (users.controller.js, tasks.controller.js — manejan req y res)
    ↓
src/models/ (userModel.js, taskModel.js — datos en memoria y operaciones CRUD)
```

---

## Endpoints de Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/users | Listar todos los usuarios |
| GET | /api/users/:id | Obtener un usuario por id |
| POST | /api/users | Crear un usuario nuevo |
| PUT | /api/users/:id | Actualizar un usuario |
| DELETE | /api/users/:id | Eliminar un usuario |
| GET | /api/users/:userId/tasks | Tareas asignadas a un usuario |

### Cuerpo para POST /api/users

```json
{
  "documento": "1097497124",
  "name": "Nombre Apellido",
  "email": "correo@ejemplo.com"
}
```

---

## Endpoints de Tareas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/tasks | Listar todas las tareas |
| GET | /api/tasks/filter | Filtrar tareas por estado o usuario |
| GET | /api/tasks/dashboard | Estadísticas generales |
| GET | /api/tasks/:id | Obtener una tarea por id |
| POST | /api/tasks | Crear una tarea nueva |
| PUT | /api/tasks/:id | Actualizar una tarea |
| DELETE | /api/tasks/:id | Eliminar una tarea |
| PATCH | /api/tasks/:id/status | Cambiar el estado de una tarea |
| POST | /api/tasks/:taskId/assign | Asignar usuarios a una tarea |
| GET | /api/tasks/:taskId/users | Ver usuarios asignados a una tarea |
| DELETE | /api/tasks/:taskId/users/:userId | Quitar un usuario de una tarea |

### Cuerpo para POST /api/tasks

```json
{
  "title": "Título de la tarea",
  "description": "Descripción detallada",
  "status": "pendiente",
  "assignedUsers": [1, 2]
}
```

### Valores válidos para status

```
pendiente | en_progreso | completada
```

---

## Metodología de Trabajo (GitFlow)

```bash
# 1. Sincronizar con release
git checkout release
git pull origin release

# 2. Crear rama de tarea
git checkout -b feat/nombre-tarea

# 3. Desarrollar y commitear
git add .
git commit -m "feat(capa): descripcion de lo que hace (#ID-issue)"

# 4. Sincronizar antes de subir
git checkout release
git pull origin release
git checkout feat/nombre-tarea
git merge release

# 5. Subir y abrir PR hacia release
git push origin feat/nombre-tarea
```

---

## Blindaje de Ramas

- **`main`** → Solo recibe desde `release` al cerrar un Milestone. PR obligatorio.
- **`release`** → Rama de integración. Todo entra por PR. Nadie hace push directo.

---

## Institución

- **Institución:** Servicio Nacional de Aprendizaje (SENA)
- **Programa:** Técnico en Programación de Software
