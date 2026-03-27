// MÓDULO: app.js
// CAPA: Entrada (configura Express y registra las rutas)

// inicializa el pool de conexiones con MySQL al arrancar el servidor
// debe ser el primer import para que el pool esté listo antes de que lleguen peticiones
import './database/db.connection.js';
import express from 'express';
import cors from 'cors';

import usersRouter from './routes/users.routes.js';
import tasksRouter from './routes/tasks.routes.js';

const app = express();

// habilita CORS para que el frontend pueda hacer peticiones al backend
// sin esto el navegador bloquearía las peticiones con un error de origen cruzado
app.use(cors());

// configura el servidor para recibir cuerpos de petición en formato JSON
// necesario para leer req.body en los controladores (POST, PUT, PATCH)
app.use(express.json());

// configura para recibir datos enviados desde formularios HTML
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// ruta raíz para verificar que el servidor está activo
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Bienvenido al servidor de Gestión de Tareas — SENA' });
});

// rutas de usuarios: GET/POST/PUT/DELETE /api/users
app.use('/api/users', usersRouter);

// rutas de tareas: GET/POST/PUT/PATCH/DELETE /api/tasks
app.use('/api/tasks', tasksRouter);

app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});