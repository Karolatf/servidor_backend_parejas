// MÓDULO: app.js
// CAPA: Entrada (configura Express y registra las rutas)

// Importamos db.connection.js primero para inicializar el pool de conexiones a MySQL
// debe ser el primer import para que el pool esté listo antes de que lleguen peticiones
import './database/db.connection.js';
// Importamos express que es el framework que crea el servidor HTTP
import express from 'express';
// Importamos cors para permitir que el frontend (en otro puerto) haga peticiones al backend
import cors from 'cors';

// Importamos errorMiddleware que captura todos los errores que llegan vía next(error)
import { errorMiddleware } from './middlewares/error.middleware.js';
// Importamos los routers de cada módulo — cada uno define sus rutas y controladores
import authRouter     from './routes/auth.routes.js';
import usersRouter    from './routes/users.routes.js';
import tasksRouter    from './routes/tasks.routes.js';
import calendarRouter from './routes/calendar.routes.js';
import notesRouter    from './routes/notes.routes.js';
// Importamos verifyToken que protege las rutas que requieren que el usuario esté logueado
import { verifyToken } from './middlewares/auth.middleware.js';

// Creamos la instancia principal de Express — es el objeto que representa al servidor
const app = express();

// Habilitamos CORS para que el navegador permita peticiones desde el frontend
// sin esto el navegador bloquearía las peticiones con un error de "cross-origin"
app.use(cors());

// Configuramos el servidor para leer cuerpos de petición en formato JSON
// necesario para acceder a req.body en los controladores (POST, PUT, PATCH)
app.use(express.json());

// Configuramos el servidor para leer datos enviados desde formularios HTML tradicionales
app.use(express.urlencoded({ extended: true }));

// Leemos el puerto del archivo .env — si no está definido usamos el 3000 por defecto
const PORT = process.env.PORT || 3000;

// Ruta raíz pública para verificar que el servidor está activo y respondiendo
app.get('/', (req, res) => {
    // Respondemos con un mensaje de bienvenida en JSON — útil para probar que el servidor corre
    res.status(200).json({ message: 'Bienvenido al servidor de Gestión de Tareas — SENA' });
});

// Ruta de autenticación — PÚBLICA (no requiere token)
// login, register y recuperación de contraseña no necesitan estar autenticado
app.use('/api/auth', authRouter);

// Rutas protegidas — verifyToken verifica el JWT antes de que lleguen al controlador
// Si el token es inválido o falta, verifyToken responde 401 antes de llegar a la ruta
app.use('/api/users',    verifyToken, usersRouter);
app.use('/api/tasks',    verifyToken, tasksRouter);
app.use('/api/calendar', verifyToken, calendarRouter);
app.use('/api/notes',    verifyToken, notesRouter);

// Registramos errorMiddleware DESPUÉS de todas las rutas para que capture sus errores
// Si se registra antes de las rutas, los errores de las rutas no llegarán a este middleware
app.use(errorMiddleware);

// Iniciamos el servidor en el puerto configurado y mostramos la URL en consola
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
