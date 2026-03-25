// inicializa el pool de conexiones con MySQL al arrancar el servidor
// debe ser el primer import para que el pool esté listo antes de que lleguen peticiones
import './database/connection.js';
import express from 'express';
import cors from 'cors';

// Se importan los archivos de rutas NUEVOS creados por Paulo en esta guía
// userRoutes.js reemplaza a users.routes.js (los archivos viejos NO se borran)
// taskRoutes.js reemplaza a tasks.routes.js
import usersRouter from './routes/userRoutes.js';
import tasksRouter from './routes/taskRoutes.js';

// Se crea la instancia principal del servidor Express
const app = express();

// Se habilita CORS para que el frontend pueda hacer peticiones al backend
// Sin esto el navegador bloquearía las peticiones con un error de origen cruzado
app.use(cors());

// Se configura el servidor para recibir cuerpos de petición en formato JSON
// Necesario para leer req.body en los controladores (POST, PUT, PATCH)
app.use(express.json());

// Se configura para recibir datos enviados desde formularios HTML
app.use(express.urlencoded({ extended: true }));

const port = 3000;

// Ruta raíz para verificar que el servidor está activo
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Hola, Bienvenido a mi servidor' });
});

// Se registran las rutas de usuarios bajo el prefijo /api/users
// El router de Paulo define la parte final: /, /:id, /:userId/tasks, etc.
// Ejemplo: GET http://localhost:3000/api/users
app.use('/api/users', usersRouter);

// Se registran las rutas de tareas bajo el prefijo /api/tasks
// El router de Paulo define la parte final: /, /filter, /dashboard, /:id, etc.
// Ejemplo: GET http://localhost:3000/api/tasks/filter
app.use('/api/tasks', tasksRouter);

// Se inicia el servidor en el puerto 3000
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});