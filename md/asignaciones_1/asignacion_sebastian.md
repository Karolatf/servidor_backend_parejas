# Asignacion de trabajo - Sebastian

Guia: Modelos y separacion de responsabilidades
Rol: Desarrollador backend y API frontend
Rama de trabajo: developer
Repositorios: servidor_backend_parejas (fork) y transferencia_dom (fork)

---

## Contexto general

Tu trabajo es el mas tecnico de los tres.

En el backend creas los modelos y reescribes los controladores.
El proyecto ya tiene una carpeta src/controller (en singular) con dos archivos:
users.controller.js y tasks.controller.js. Esos archivos tienen funciones
basicas sin modelo ni try/catch. Los vas a reescribir completamente.
Tambien creas una carpeta nueva: src/models con dos archivos dentro.

En el frontend creas un archivo nuevo: src/api/usuariosApi.js con las
funciones fetch para los endpoints de usuarios.
Karol trabaja en src/ui y en index.html y styles.css.
Paulo trabaja en src/routes.
Nunca se pisan archivos entre los tres.

---

## Sobre los campos del usuario y el id

El servidor simulado (servidor_uso_personal) tiene usuarios donde el id
es el numero de documento. Eso fue valido en guias anteriores pero ahora
no es la arquitectura correcta. En el backend nuevo cada usuario tiene:

    id:        numero consecutivo generado automaticamente (1, 2, 3)
    documento: numero de identidad del usuario
    name:      nombre completo
    email:     correo electronico

Los modelos que creas usan esta estructura. El id se genera incrementando
un contador interno en el modelo, igual que lo haria una base de datos real.

---

## Sobre las tareas en el backend

En server.json las tareas empiezan vacias. En el backend nuevo el modelo
de tareas tambien empieza con un arreglo vacio. Las tareas se crean desde
el frontend y se guardan en memoria mientras el servidor este corriendo.
Cada tarea puede tener varios usuarios asignados.

---

## Antes de empezar

Si llegas a tu computador con cambios pendientes de sincronizar,
ejecuta esto en GitBash antes de empezar:

    cd ruta/a/tu/fork/servidor_backend_parejas
    git checkout developer
    git fetch upstream
    git pull upstream release
    git push origin developer

Si aun no tienes configurado upstream ejecuta primero:

    git remote add upstream URL_DEL_REPO_DE_KAROL_BACKEND

Para el frontend:

    cd ruta/a/tu/fork/transferencia_dom
    git checkout developer
    git fetch upstream
    git pull upstream release
    git push origin developer

Si aun no tienes configurado upstream para el frontend ejecuta primero:

    git remote add upstream URL_DEL_REPO_DE_KAROL_FRONTEND

---

## Tarea 1 - Crear el modelo de usuarios

Repositorio: servidor_backend_parejas
Archivo a crear: src/models/userModel.js

La carpeta src/models no existe todavia. Creala en VS Code antes de crear el archivo.

Este archivo contiene un arreglo de usuarios con tres usuarios de prueba
(Paulo, Sebastian, Karol) con id 1, 2, 3. Cada usuario tiene los campos:
id, documento, name y email.

También contiene un contador que empieza en 4 para que el proximo usuario
creado reciba id 4, luego 5, y asi sucesivamente.

Las funciones que debe tener este archivo son:

    getAllUsers: devuelve el arreglo completo de usuarios
    getUserById: recibe un id y devuelve el usuario que lo tenga, o null si no existe
    getUserByDocumento: recibe un numero de documento y devuelve el usuario, o null
    createUser: recibe un objeto con documento, name y email, le asigna el siguiente
                id disponible usando el contador, lo agrega al arreglo y lo devuelve
    updateUser: recibe un id y un objeto con los campos a actualizar, modifica el usuario
                en el arreglo y devuelve el usuario actualizado, o null si no existe
    deleteUser: recibe un id, elimina el usuario del arreglo y devuelve true,
                o devuelve false si el usuario no existe

Estas funciones no usan req ni res. Solo trabajan con el arreglo de datos
y devuelven los resultados. El controlador es quien recibe req y res.

Comenta cada funcion antes de abrirse explicando que hace.
Comenta cada bloque de logica dentro de la funcion explicando que hace esa parte.
Sin decoraciones como === ni flechas en los comentarios.

Cuando termines, en GitBash:

    cd ruta/a/tu/fork/servidor_backend_parejas
    git add src/models/userModel.js
    git commit -m "feat: crear userModel con arreglo inicial y funciones CRUD"
    git push origin developer

Commit para copiar y pegar:

    feat: crear userModel con arreglo inicial y funciones CRUD

---

## Tarea 2 - Crear el modelo de tareas

Repositorio: servidor_backend_parejas
Archivo a crear: src/models/taskModel.js

Este archivo esta en la misma carpeta src/models que acabas de crear.

El arreglo de tareas empieza vacio porque las tareas se crean desde el frontend.
Tambien tiene un contador que empieza en 1.

Cada tarea que se cree debe tener los campos:
    id:            numero consecutivo generado por el contador
    title:         titulo de la tarea
    description:   descripcion de la tarea
    status:        estado (pendiente, en_progreso, completada)
    assignedUsers: arreglo de ids de usuarios asignados (puede estar vacio al crear)
    createdAt:     fecha de creacion generada automaticamente con new Date().toISOString()

Las funciones que debe tener este archivo son:

    getAllTasks: devuelve el arreglo completo de tareas
    getTaskById: recibe un id y devuelve la tarea, o null si no existe
    createTask: recibe los datos de la tarea, le asigna id y createdAt, la agrega
                al arreglo y la devuelve
    updateTask: recibe un id y los datos a actualizar, modifica la tarea y la devuelve,
                o null si no existe
    deleteTask: recibe un id, elimina la tarea y devuelve true, o false si no existe
    updateTaskStatus: recibe un id y un nuevo estado, actualiza solo el campo status
                      y devuelve la tarea actualizada, o null si no existe
    assignUsersToTask: recibe un taskId y un arreglo de userIds, reemplaza el campo
                       assignedUsers de la tarea con ese arreglo y devuelve la tarea,
                       o null si la tarea no existe
    removeUserFromTask: recibe un taskId y un userId, elimina ese userId del arreglo
                        assignedUsers de la tarea y devuelve la tarea, o null si no existe
    getTasksByUserId: recibe un userId y devuelve todas las tareas donde ese userId
                      este en el arreglo assignedUsers
    filterTasks: recibe un objeto con filtros opcionales (status, userId) y devuelve
                 las tareas que cumplan todos los filtros que vengan en el objeto

Comenta cada funcion antes de abrirse explicando que hace.
Comenta cada bloque de logica dentro de la funcion explicando que hace esa parte.
Sin decoraciones como === ni flechas en los comentarios.

Cuando termines:

    git add src/models/taskModel.js
    git commit -m "feat: crear taskModel con arreglo vacio, assignedUsers y funciones completas"
    git push origin developer

Commit para copiar y pegar:

    feat: crear taskModel con arreglo vacio, assignedUsers y funciones completas

---

## Tarea 3 - Reescribir el controlador de usuarios

Repositorio: servidor_backend_parejas
Archivo a modificar: src/controller/users.controller.js

Este archivo ya existe. Lo reescribes completamente.
La carpeta se llama controller en singular, no controllers. Respeta ese nombre.

El archivo actual tiene funciones basicas sin modelo ni try/catch.
Lo reemplazas con funciones que importan el modelo y manejan errores.

El archivo debe importar el userModel al inicio:

    import * as userModel from '../models/userModel.js';

Las funciones que debe tener son:

    getUsers: llama a userModel.getAllUsers() y responde con status 200 y el arreglo
    getUserById: lee req.params.id, llama a userModel.getUserById(), si no existe
                 responde 404, si existe responde 200 con el usuario
    createUser: lee req.body con los campos documento, name y email, llama a
                userModel.createUser() y responde 201 con el usuario creado
    updateUser: lee req.params.id y req.body, llama a userModel.updateUser(),
                si no existe responde 404, si existe responde 200 con el actualizado
    deleteUser: lee req.params.id, llama a userModel.deleteUser(), si no existe
                responde 404, si se elimino responde 200 con mensaje de confirmacion
    getUserTasks: lee req.params.userId, llama a userModel.getUserById() para verificar
                  que existe y luego llama a taskModel.getTasksByUserId() para obtener
                  sus tareas, responde 200 con el arreglo de tareas

Para getUserTasks tambien necesitas importar taskModel:

    import * as taskModel from '../models/taskModel.js';

Todas las funciones usan try/catch. El catch responde con status 500 y un objeto
con un campo message que describe el error.

Comenta cada funcion antes de abrirse explicando que hace.
Comenta cada bloque de logica dentro de la funcion explicando que hace esa parte.
Sin decoraciones como === ni flechas en los comentarios.

Exporta todas las funciones al final del archivo:

    export { getUsers, getUserById, createUser, updateUser, deleteUser, getUserTasks }

Cuando termines:

    git add src/controller/users.controller.js
    git commit -m "feat: reescribir userController con modelo, try/catch y codigos HTTP correctos"
    git push origin developer

Commit para copiar y pegar:

    feat: reescribir userController con modelo, try/catch y codigos HTTP correctos

---

## Tarea 4 - Reescribir el controlador de tareas

Repositorio: servidor_backend_parejas
Archivo a modificar: src/controller/tasks.controller.js

Este archivo ya existe. Lo reescribes completamente.

El archivo debe importar el taskModel al inicio:

    import * as taskModel from '../models/taskModel.js';

Las funciones que debe tener son:

    getTasks: llama a taskModel.getAllTasks() y responde 200 con el arreglo
    getTaskById: lee req.params.id, llama a taskModel.getTaskById(), si no existe
                 responde 404, si existe responde 200 con la tarea
    createTask: lee req.body con title, description, status y assignedUsers (opcional),
                llama a taskModel.createTask() y responde 201 con la tarea creada
    updateTask: lee req.params.id y req.body, llama a taskModel.updateTask(),
                si no existe responde 404, si existe responde 200 con la actualizada
    deleteTask: lee req.params.id, llama a taskModel.deleteTask(), si no existe
                responde 404, si se elimino responde 200 con mensaje de confirmacion
    updateTaskStatus: lee req.params.id y req.body.status, llama a
                      taskModel.updateTaskStatus(), responde 200 con la tarea actualizada
    assignUsersToTask: lee req.params.taskId y req.body.userIds (arreglo), llama a
                       taskModel.assignUsersToTask(), responde 200 con la tarea actualizada
    getAssignedUsers: lee req.params.taskId, llama a taskModel.getTaskById() para obtener
                      la tarea y responde 200 con el arreglo assignedUsers
    removeUserFromTask: lee req.params.taskId y req.params.userId, llama a
                        taskModel.removeUserFromTask(), responde 200 con la tarea actualizada
    filterTasks: lee req.query con los parametros status y userId si los hay,
                 llama a taskModel.filterTasks() con esos filtros y responde 200
    getDashboard: llama a taskModel.getAllTasks(), calcula total de tareas,
                  cuantas hay por cada estado, y responde 200 con ese objeto de estadisticas

Todas las funciones usan try/catch. El catch responde con status 500.

Comenta cada funcion antes de abrirse explicando que hace.
Comenta cada bloque de logica dentro de la funcion explicando que hace esa parte.
Sin decoraciones como === ni flechas en los comentarios.

Exporta todas las funciones al final:

    export {
      getTasks, getTaskById, createTask, updateTask, deleteTask,
      updateTaskStatus, assignUsersToTask, getAssignedUsers,
      removeUserFromTask, filterTasks, getDashboard
    }

Cuando termines:

    git add src/controller/tasks.controller.js
    git commit -m "feat: reescribir taskController con modelo, try/catch y operaciones completas"
    git push origin developer

Commit para copiar y pegar:

    feat: reescribir taskController con modelo, try/catch y operaciones completas

---

## Tarea 5 - Crear las funciones fetch de usuarios en el frontend

Repositorio: transferencia_dom
Archivo a crear: src/api/usuariosApi.js

Este archivo no existe. Lo creas desde cero.
El archivo que ya existe (tareasApi.js) maneja tareas. Este nuevo maneja usuarios.

La estructura debe ser igual a tareasApi.js: importa API_BASE_URL desde
../utils/config.js y exporta funciones async con try/catch.

Las funciones que debe tener son:

    obtenerTodosLosUsuarios: hace GET a /api/users y devuelve el arreglo,
                             o null si hay error
    obtenerUsuarioPorId: recibe un id, hace GET a /api/users/:id y devuelve
                         el usuario, o null si hay error
    crearUsuario: recibe un objeto con documento, name y email, hace POST a /api/users
                  con ese objeto en el body y devuelve el usuario creado, o null
    actualizarUsuario: recibe un id y un objeto con los campos a actualizar,
                       hace PUT a /api/users/:id y devuelve el usuario actualizado, o null
    eliminarUsuario: recibe un id, hace DELETE a /api/users/:id y devuelve true
                     si fue exitoso, o false si hay error

Comenta cada funcion antes de abrirse explicando que hace.
Comenta cada bloque de logica dentro de la funcion explicando que hace esa parte.
Sin decoraciones como === ni flechas en los comentarios.
Sigue exactamente la misma estructura de comentarios que tiene tareasApi.js
para que el estilo sea consistente en todo el proyecto.

Cuando termines, en GitBash:

    cd ruta/a/tu/fork/transferencia_dom
    git add src/api/usuariosApi.js
    git commit -m "feat: crear usuariosApi con funciones fetch para endpoints de usuarios"
    git push origin developer

Commit para copiar y pegar:

    feat: crear usuariosApi con funciones fetch para endpoints de usuarios

---

## Pull Request del backend

Cuando los cuatro archivos del backend esten subidos, crea el PR desde tu fork
hacia release en el repo de Karol.

    Titulo: feat: modelos y controladores de usuarios y tareas

    Comentario:
    Que se hizo:
    Se crearon los modelos que gestionan los datos en memoria y se reescribieron
    los controladores para que usen esos modelos con manejo de errores.
    - src/models/userModel.js: arreglo inicial con 3 usuarios (id 1,2,3) y funciones CRUD
    - src/models/taskModel.js: arreglo vacio, campo assignedUsers y funciones completas
    - src/controller/users.controller.js: reescrito con modelo, try/catch y 404/200/201/500
    - src/controller/tasks.controller.js: reescrito con operaciones completas y filtros

    Por que:
    La guia exige separar responsabilidades. El modelo solo gestiona datos en memoria,
    el controlador recibe la peticion, llama al modelo y envia la respuesta HTTP.

    Archivos nuevos:
    - src/models/userModel.js
    - src/models/taskModel.js

    Archivos reescritos:
    - src/controller/users.controller.js
    - src/controller/tasks.controller.js

    Nota:
    Paulo crea las rutas que importan estos controladores.
    Karol actualiza app.js para conectar todo.

---

## Pull Request del frontend

Cuando el archivo del frontend este subido, crea el PR desde tu fork
hacia release en el repo de Karol del frontend.

    Titulo: feat: agregar funciones fetch de usuarios

    Comentario:
    Que se hizo:
    Se creo src/api/usuariosApi.js con las cinco funciones fetch para los endpoints
    de usuarios: obtener todos, obtener por id, crear, actualizar y eliminar.

    Por que:
    Karol necesita importar estas funciones en adminPanel.js para que el panel de
    administracion pueda mostrar, crear y eliminar usuarios desde el frontend.

    Archivos nuevos:
    - src/api/usuariosApi.js