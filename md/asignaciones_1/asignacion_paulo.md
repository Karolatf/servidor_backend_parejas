# Asignacion de trabajo - Paulo

Guia: Modelos y separacion de responsabilidades
Rol: Desarrollador backend
Rama de trabajo: desarrollador
Repositorio: servidor_backend_parejas (trabajas desde tu fork)

---

## Contexto general

Tu trabajo es crear los archivos de rutas nuevos y el README del proyecto.

El proyecto ya tiene una carpeta src/routes con dos archivos existentes:
users.routes.js y tasks.routes.js. Esos archivos tienen la logica inline
(las funciones estan dentro de las rutas en lugar de venir de un controlador).
Los archivos nuevos que vas a crear se llaman userRoutes.js y taskRoutes.js.
Los archivos viejos quedan en la carpeta, no los borres ni los toques.

La diferencia clave entre los archivos viejos y los nuevos:
En los viejos la logica esta dentro del archivo de rutas.
En los nuevos las rutas solo importan funciones del controlador y las llaman.
Las rutas no hacen nada por su cuenta, solo dirigen la peticion.

Sebastian trabaja en src/models y src/controller al mismo tiempo.
Karol trabaja en app.js y en el frontend.
Nunca se pisan archivos entre los tres.

---

## Sobre la carpeta controller

La carpeta se llama src/controller en singular, no src/controllers.
Los archivos dentro se llaman users.controller.js y tasks.controller.js.
Sebastian los reescribe con nuevas funciones exportadas.
Tus archivos de rutas importan esas funciones.

---

## Sobre los prefijos de ruta

Los archivos de rutas no llevan el prefijo /api/users ni /api/tasks.
Esos prefijos los define Karol en app.js con app.use().
En tus archivos solo escribes la parte final de cada ruta.
Por ejemplo, dentro de userRoutes.js la ruta de obtener todos es:

    router.get('/', getUsers)

Y Karol en app.js hace:

    app.use('/api/users', usersRouter)

Eso hace que el endpoint completo sea GET /api/users.

---

## Sobre ES Modules

El proyecto usa type module en package.json.
Eso significa que se usa import y export en lugar de require y module.exports.
Todos los imports deben tener la extension .js al final:

    import { getUsers } from '../controller/users.controller.js';

Si olvidas el .js el servidor no encontrara el archivo.

---

## Antes de empezar

Si llegas a tu computador con cambios pendientes de sincronizar,
ejecuta esto en GitBash antes de empezar:

    cd ruta/a/tu/fork/servidor_backend_parejas
    git checkout desarrollador
    git fetch upstream
    git pull upstream release
    git push origin desarrollador

Si aun no tienes configurado upstream (el repo original de Karol) ejecuta primero:

    git remote add upstream URL_DEL_REPO_DE_KAROL

Luego si el pull upstream release.

---

## Tarea 1 - Crear las rutas de usuarios

Repositorio: servidor_backend_parejas
Archivo a crear: src/routes/userRoutes.js

La carpeta src/routes ya existe. Solo creas el archivo nuevo ahi.

Este archivo importa express, crea un router con express.Router()
e importa las funciones del controlador de usuarios.

Las funciones que importas de users.controller.js son:

    getUsers, getUserById, createUser, updateUser, deleteUser, getUserTasks

Define las rutas usando router.get(), router.post(), router.put(),
router.delete() y router.patch() segun corresponda.
Al final exporta el router con export default router.

Las rutas que debe tener el archivo son:

    GET    /                  llama a getUsers
    GET    /:id               llama a getUserById
    POST   /                  llama a createUser
    PUT    /:id               llama a updateUser
    DELETE /:id               llama a deleteUser
    GET    /:userId/tasks     llama a getUserTasks

Nota sobre el orden: la ruta GET /:userId/tasks debe ir antes de GET /:id
si hubiera conflicto, pero como tienen rutas diferentes no hay problema.

Comenta cada ruta con una linea explicando que endpoint representa
y que operacion realiza. Sin decoraciones como === ni flechas.

El archivo debe verse asi en estructura general:

    import express from 'express';
    import { getUsers, getUserById, createUser, updateUser, deleteUser, getUserTasks }
      from '../controller/users.controller.js';

    const router = express.Router();

    // comentario
    router.get('/', getUsers);

    // comentario
    router.get('/:id', getUserById);

    // ... y asi con cada ruta

    export default router;

Cuando termines, en GitBash:

    cd ruta/a/tu/fork/servidor_backend_parejas
    git add src/routes/userRoutes.js
    git commit -m "feat: crear userRoutes con endpoints CRUD y tareas por usuario"
    git push origin desarrollador

Commit para copiar y pegar:

    feat: crear userRoutes con endpoints CRUD y tareas por usuario

---

## Tarea 2 - Crear las rutas de tareas

Repositorio: servidor_backend_parejas
Archivo a crear: src/routes/taskRoutes.js

Igual que el anterior pero para tareas. Importa las funciones del controlador de tareas.

Las funciones que importas de tasks.controller.js son:

    getTasks, getTaskById, createTask, updateTask, deleteTask,
    updateTaskStatus, assignUsersToTask, getAssignedUsers,
    removeUserFromTask, filterTasks, getDashboard

Las rutas que debe tener el archivo son:

    GET    /                          llama a getTasks
    GET    /filter                    llama a filterTasks
    GET    /dashboard                 llama a getDashboard
    GET    /:id                       llama a getTaskById
    POST   /                          llama a createTask
    PUT    /:id                       llama a updateTask
    DELETE /:id                       llama a deleteTask
    PATCH  /:id/status                llama a updateTaskStatus
    POST   /:taskId/assign            llama a assignUsersToTask
    GET    /:taskId/users             llama a getAssignedUsers
    DELETE /:taskId/users/:userId     llama a removeUserFromTask

Atencion importante con el orden de las rutas:
Las rutas con segmentos fijos como /filter y /dashboard deben ir antes de
las rutas con parametros dinamicos como /:id.
Si pones /:id primero, Express interpreta /filter como un id con valor "filter"
y nunca llega a la ruta correcta.

El orden correcto es:

    router.get('/filter', filterTasks);
    router.get('/dashboard', getDashboard);
    router.get('/:id', getTaskById);

Comenta cada ruta con una linea explicando que endpoint representa
y que operacion realiza. Sin decoraciones como === ni flechas.

Cuando termines:

    git add src/routes/taskRoutes.js
    git commit -m "feat: crear taskRoutes con todos los endpoints de tareas"
    git push origin desarrollador

Commit para copiar y pegar:

    feat: crear taskRoutes con todos los endpoints de tareas

---

## Tarea 3 - Crear el README del proyecto backend

Repositorio: servidor_backend_parejas
Archivo a crear: README.md en la raiz del repositorio

Este archivo documenta el proyecto para cualquier persona que lo abra en GitHub.
Un README claro es parte de la evidencia que pide la guia.

El archivo debe tener las siguientes secciones:

    Nombre del proyecto: Sistema de Gestion de Tareas - Backend
    Descripcion: breve explicacion de para que sirve el backend
    Equipo: Paulo Pacheco, Sebastian Patino, Karol Torres
    Como ejecutar: npm run dev (el servidor queda en http://localhost:3000)
    Estructura de carpetas: lista de src/models, src/controller, src/routes, src/app.js
    Tabla de endpoints completa con columnas: Metodo, Ruta, Descripcion

La tabla de endpoints debe incluir todas las rutas de la guia:

    Metodo  Ruta                            Descripcion
    GET     /api/users                      Obtener todos los usuarios
    GET     /api/users/:id                  Obtener un usuario por id
    POST    /api/users                      Crear un usuario
    PUT     /api/users/:id                  Actualizar un usuario
    DELETE  /api/users/:id                  Eliminar un usuario
    GET     /api/users/:userId/tasks        Tareas de un usuario especifico
    GET     /api/tasks                      Obtener todas las tareas
    GET     /api/tasks/filter               Filtrar tareas por estado o usuario
    GET     /api/tasks/dashboard            Estadisticas generales
    GET     /api/tasks/:id                  Obtener una tarea por id
    POST    /api/tasks                      Crear una tarea
    PUT     /api/tasks/:id                  Actualizar una tarea
    DELETE  /api/tasks/:id                  Eliminar una tarea
    PATCH   /api/tasks/:id/status           Cambiar estado de una tarea
    POST    /api/tasks/:taskId/assign       Asignar usuarios a una tarea
    GET     /api/tasks/:taskId/users        Ver usuarios asignados a una tarea
    DELETE  /api/tasks/:taskId/users/:userId  Quitar un usuario de una tarea

Cuando termines:

    git add README.md
    git commit -m "docs: crear README con descripcion del proyecto y tabla de endpoints"
    git push origin desarrollador

Commit para copiar y pegar:

    docs: crear README con descripcion del proyecto y tabla de endpoints

---

## Pull Request

Cuando los tres archivos esten subidos, crea el PR desde tu fork hacia release
en el repo de Karol.

    Titulo: feat: rutas nuevas por capas y documentacion del proyecto

    Comentario:
    Que se hizo:
    Se crearon los archivos de rutas que conectan los endpoints HTTP con las
    funciones de los controladores. Tambien se creo el README de documentacion.
    - userRoutes.js: rutas separadas por capa que importan del controlador de usuarios
    - taskRoutes.js: rutas completas de tareas con orden correcto para evitar conflictos
    - README.md: documentacion del proyecto con tabla de todos los endpoints

    Por que:
    Los archivos viejos (users.routes.js y tasks.routes.js) tenian la logica
    mezclada dentro de las rutas. Los nuevos siguen la arquitectura MVC donde la
    ruta solo dirige la peticion y el controlador contiene la logica.
    El README es evidencia requerida por la guia.

    Archivos nuevos:
    - src/routes/userRoutes.js
    - src/routes/taskRoutes.js
    - README.md

    Archivos que no se tocaron:
    - src/routes/users.routes.js (el anterior, queda como referencia)
    - src/routes/tasks.routes.js (el anterior, queda como referencia)

    Nota:
    Este PR debe mergearse antes de que Karol actualice app.js porque ella
    importa los nuevos archivos de rutas. Las rutas importan los controladores
    que reescribio Sebastian, por eso el PR de Sebastian debe mergearse primero.