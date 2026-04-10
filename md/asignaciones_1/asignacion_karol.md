# Asignacion de trabajo - Karol

Guia: Modelos y separacion de responsabilidades
Rol: Lider del proyecto
Rama de trabajo: desarrolladora
Repositorios: servidor_backend_parejas y transferencia_dom
Tag al finalizar: v2.2.0 (minor porque se agregan funcionalidades nuevas)

---

## Contexto general

Tu trabajo esta dividido en dos repositorios.

En el backend modificas src/app.js para que las rutas usen el prefijo /api.
Actualmente app.js registra /users y /tasks. La nueva arquitectura usa /api/users
y /api/tasks. Tambien cambias los imports para que apunten a los archivos nuevos
que creo Paulo (userRoutes.js y taskRoutes.js) en lugar de los que ya existian
(users.routes.js y tasks.routes.js).

En el frontend creas dos vistas nuevas y modificas HTML, CSS y una linea en tareasApi.js.
Sebastian trabaja en src/api/usuariosApi.js y en el backend (modelos y controladores).
Paulo trabaja en src/routes del backend.
Nunca se pisan archivos entre los tres.

---

## Sobre el cambio de id en el proyecto

Actualmente en server.json (servidor_uso_personal) el id de cada usuario
es su numero de documento:

    { "id": 1097497124, "name": "Karol Torres", "email": "karoln.oficiall@gmail.com" }

El backend nuevo trabaja diferente. En los modelos que crea Sebastian los usuarios
tienen estos campos:

    id:        1, 2, 3  (numero consecutivo segun el orden de creacion)
    documento: numero de identidad del usuario
    name:      nombre completo
    email:     correo electronico

Esto significa que el frontend necesita un ajuste porque antes la funcion
buscarUsuarioPorDocumento() comparaba lo que escribia el usuario con el campo id,
y ahora debe compararlo con el campo documento.

El archivo que hace esa busqueda es src/api/tareasApi.js.
La funcion buscarUsuarioPorDocumento() actualmente tiene esta linea:

    const usuario = usuarios.find(u => u.id.toString() === documentoId.toString());

Debe quedar asi:

    const usuario = usuarios.find(u => u.documento.toString() === documentoId.toString());

Ese es el unico cambio en ese archivo. El resto queda identico.

---

## Antes de empezar

Abre GitBash y actualiza los dos repositorios:

Backend:

    cd /c/sena/servidor_backend_parejas
    git checkout desarrolladora
    git pull origin release

Frontend:

    cd /c/sena/transferencia_dom
    git checkout desarrolladora
    git pull origin release

---

## Tarea 1 - Modificar app.js en el backend

Repositorio: servidor_backend_parejas
Archivo a modificar: src/app.js

Espera a que Sebastian y Paulo confirmen que sus PRs fueron mergeados en release.
Luego jala los cambios antes de editar:

    cd /c/sena/servidor_backend_parejas
    git pull origin release

Abre src/app.js en VS Code. El archivo actual se ve asi:

    import express from 'express';
    import cors from 'cors';
    import usersRouter from './routes/users.routes.js';
    import tasksRouter from './routes/tasks.routes.js';

    const app = express()
    app.use(cors())
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))
    const port = 3000

    app.get('/', (req, res) => {
      res.status(200).json({ message: 'Hola, Bienvenido a mi servidor' })
    });

    app.use('/tasks', tasksRouter)
    app.use('/users', usersRouter)

    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`)
    })

Debes hacer dos cambios:
Cambio 1: las dos lineas de import deben apuntar a los archivos nuevos de Paulo.
Cambio 2: los prefijos de ruta deben tener /api delante.

El archivo debe quedar asi con todos sus comentarios:

    import express from 'express';
    import cors from 'cors';

    // Se importan los archivos de rutas nuevos creados por Paulo en esta guia
    import usersRouter from './routes/userRoutes.js';
    import tasksRouter from './routes/taskRoutes.js';

    // Se crea la instancia principal del servidor Express
    const app = express();

    // Se habilita CORS para que el frontend pueda hacer peticiones al backend
    app.use(cors());

    // Se configura el servidor para recibir cuerpos de peticion en formato JSON
    app.use(express.json());

    // Se configura para recibir datos enviados desde formularios HTML
    app.use(express.urlencoded({ extended: true }));

    const port = 3000;

    // Ruta raiz para verificar que el servidor esta activo
    app.get('/', (req, res) => {
      res.status(200).json({ message: 'Hola, Bienvenido a mi servidor' });
    });

    // Se registran las rutas de usuarios bajo el prefijo /api/users
    app.use('/api/users', usersRouter);

    // Se registran las rutas de tareas bajo el prefijo /api/tasks
    app.use('/api/tasks', tasksRouter);

    // Se inicia el servidor en el puerto 3000
    app.listen(port, () => {
      console.log(`Servidor escuchando en el puerto ${port}`);
    });

Cuando termines, en GitBash:

    cd /c/sena/servidor_backend_parejas
    git add src/app.js
    git commit -m "feat: actualizar prefijos de rutas a /api y apuntar a archivos nuevos"
    git push origin desarrolladora

Commit para copiar y pegar:

    feat: actualizar prefijos de rutas a /api y apuntar a archivos nuevos

Pull Request del backend:

    Titulo: feat: conectar rutas nuevas en app.js con prefijo /api

    Comentario:
    Que se hizo:
    Se modifico app.js para importar los archivos de rutas nuevos (userRoutes.js
    y taskRoutes.js) creados por Paulo, y se cambiaron los prefijos de ruta
    de /users y /tasks a /api/users y /api/tasks.

    Por que:
    El prefijo /api es la convencion REST para identificar los endpoints del servidor.
    Sin este cambio las nuevas rutas por capas no responden correctamente.

    Archivos modificados:
    - src/app.js

    Nota:
    Este PR debe mergearse despues de los PRs de Sebastian y Paulo.

---

## Tarea 2 - Corregir la busqueda por documento en tareasApi.js

Repositorio: transferencia_dom
Archivo a modificar: src/api/tareasApi.js

Este archivo ya existe y tiene muchas funciones. Solo hay que cambiar una linea.

Busca la funcion buscarUsuarioPorDocumento(). Dentro de ella hay esta linea:

    const usuario = usuarios.find(u => u.id.toString() === documentoId.toString());

Cambiala por esta:

    const usuario = usuarios.find(u => u.documento.toString() === documentoId.toString());

Solo cambia u.id por u.documento. Todo lo demas del archivo queda igual.

Por que cambia: antes el id del usuario era su numero de documento.
Ahora el id es 1, 2 o 3 y el numero de documento es un campo separado llamado documento.
Si no haces este cambio la busqueda nunca encuentra al usuario en el backend nuevo.

Cuando termines:

    cd /c/sena/transferencia_dom
    git add src/api/tareasApi.js
    git commit -m "fix: corregir busqueda de usuario por campo documento en lugar de id"
    git push origin desarrolladora

Commit para copiar y pegar:

    fix: corregir busqueda de usuario por campo documento en lugar de id

---

## Tarea 3 - Crear la vista del panel de administracion

Repositorio: transferencia_dom
Archivo a crear: src/ui/adminPanel.js

Este archivo no existe. Lo creas desde cero.

Esta vista es para el administrador. Cuando se monte en el HTML debe mostrar
dos secciones una debajo de la otra.

Seccion de usuarios:
Muestra una tabla con todos los usuarios del sistema.
Cada fila tiene: id, documento, nombre, correo y dos botones (ver tareas y eliminar).
Arriba de la tabla hay un formulario con tres campos (documento, nombre, correo)
y un boton para crear un usuario nuevo.

Seccion de tareas:
Muestra una tabla con todas las tareas registradas.
Cada fila tiene: titulo, estado y los nombres de los usuarios asignados.

Esta vista llama a las funciones de src/api/usuariosApi.js (que crea Sebastian)
para obtener usuarios, crear uno nuevo y eliminar uno.
Para las tareas llama a las funciones ya existentes en src/api/tareasApi.js.

Cada funcion del archivo debe tener un comentario antes de abrirse explicando
que hace. Cada bloque de logica dentro de la funcion debe tener un comentario
encima explicando que hace esa parte. Sin decoraciones como === ni flechas.

Cuando termines:

    git add src/ui/adminPanel.js
    git commit -m "feat: crear vista del panel de administracion con CRUD de usuarios"
    git push origin desarrolladora

Commit para copiar y pegar:

    feat: crear vista del panel de administracion con CRUD de usuarios

---

## Tarea 4 - Crear la vista de busqueda por documento

Repositorio: transferencia_dom
Archivo a crear: src/ui/buscarUsuario.js

Este archivo no existe. Lo creas desde cero.

Esta vista permite que cualquier persona busque un usuario escribiendo
su numero de documento y vea las tareas que tiene asignadas.

La vista debe tener:
- Un campo de texto para escribir el numero de documento
- Un boton de buscar
- Un area de resultado que muestre el nombre del usuario encontrado
  y debajo una lista de sus tareas con titulo y estado
- Si el usuario no existe debe aparecer un mensaje diciendo que no se encontro

La busqueda de usuario usa la funcion buscarUsuarioPorDocumento() que ya
existe en src/api/tareasApi.js.
Para obtener las tareas de ese usuario, hace GET /api/tasks al backend
y filtra las que tienen el userId del usuario encontrado.

Cada funcion del archivo debe tener un comentario antes de abrirse explicando
que hace. Cada bloque de logica dentro de la funcion debe tener un comentario
encima explicando que hace esa parte. Sin decoraciones como === ni flechas.

Cuando termines:

    git add src/ui/buscarUsuario.js
    git commit -m "feat: crear vista de busqueda de usuario por documento y sus tareas"
    git push origin desarrolladora

Commit para copiar y pegar:

    feat: crear vista de busqueda de usuario por documento y sus tareas

---

## Tarea 5 - Modificar index.html

Repositorio: transferencia_dom
Archivo a modificar: index.html

El archivo ya existe con toda la estructura actual. Solo agregas lo necesario.

Agrega dos secciones nuevas justo antes del footer:

Primera seccion (para el panel admin):

    <section class="admin-section hidden" id="adminSection">
      <!-- Aqui adminPanel.js monta el panel de administracion -->
    </section>

Segunda seccion (para busqueda por documento):

    <section class="buscar-section hidden" id="buscarSection">
      <!-- Aqui buscarUsuario.js monta la vista de busqueda -->
    </section>

Agrega tambien dos botones de navegacion en el header, despues del parrafo
de subtitulo que ya existe:

    <div class="header__nav">
      <button type="button" class="btn btn--nav" id="btnAdmin">Panel Admin</button>
      <button type="button" class="btn btn--nav" id="btnBuscar">Buscar por Documento</button>
    </div>

Comenta cada bloque nuevo que agregues con una linea explicando para que sirve.

Cuando termines:

    git add index.html
    git commit -m "feat: agregar secciones HTML para panel admin y busqueda por documento"
    git push origin desarrolladora

Commit para copiar y pegar:

    feat: agregar secciones HTML para panel admin y busqueda por documento

---

## Tarea 6 - Ajustar estilos CSS

Repositorio: transferencia_dom
Archivo a modificar: styles.css

Agrega al final del archivo los estilos para las nuevas secciones.
No modifiques nada de lo que ya existe. Solo agrega al final.

Estilos a agregar:

    .header__nav: fila de botones centrada con gap entre ellos
    .btn--nav: boton de navegacion con fondo transparente, borde blanco y texto blanco
    .btn--nav:hover: fondo semitransparente en hover
    .admin-section y .buscar-section: mismos estilos base que .form-section
    Tabla de usuarios del admin: puede reutilizar las clases .tasks-table existentes

Cuando termines:

    git add styles.css
    git commit -m "style: agregar estilos para panel admin y busqueda por documento"
    git push origin desarrolladora

Commit para copiar y pegar:

    style: agregar estilos para panel admin y busqueda por documento

Pull Request del frontend:

    Titulo: feat: vistas de panel admin y busqueda por documento

    Comentario:
    Que se hizo:
    Se corrigio tareasApi.js para buscar usuarios por el campo documento y no por id.
    Se creo adminPanel.js con lista de usuarios, creacion y eliminacion.
    Se creo buscarUsuario.js con busqueda por documento y tareas del usuario.
    Se modifico index.html con las nuevas secciones y botones de navegacion.
    Se agregaron estilos CSS para las nuevas vistas.

    Por que:
    La guia pide que el administrador gestione usuarios y tareas, y que cualquier
    persona pueda buscar un usuario por documento y ver sus tareas.
    El cambio en tareasApi.js era necesario porque el backend nuevo separa el id
    numerico del numero de documento como campo independiente.

    Archivos modificados:
    - src/api/tareasApi.js (una linea cambiada)
    - src/ui/adminPanel.js (archivo nuevo)
    - src/ui/buscarUsuario.js (archivo nuevo)
    - index.html
    - styles.css

---

## Al finalizar - Merge de release a main y creacion del tag

Cuando todos los PRs esten mergeados en release:

Backend:

    cd /c/sena/servidor_backend_parejas
    git checkout main
    git pull origin main
    git merge release
    git push origin main
    git tag v2.2.0
    git push origin v2.2.0

Frontend:

    cd /c/sena/transferencia_dom
    git checkout main
    git pull origin main
    git merge release
    git push origin main
    git tag v2.2.0
    git push origin v2.2.0