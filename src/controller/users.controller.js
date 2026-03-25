// MÓDULO: controller/users.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)

// Responsabilidad única: manejar las peticiones HTTP de usuarios.
// NUNCA maneja datos directamente.
// Llama al modelo y decide el código de estado y el cuerpo de la respuesta.

// Paulo importa estas funciones en userRoutes.js con estos nombres exactos:
//   getUsers, getUserById, createUser, updateUser, deleteUser, getUserTasks

// Se importan las funciones del modelo de usuarios
// Se renombran con 'as' para que los nombres del export no choquen con los del modelo
import {
    getAllUsers,
    getUserById    as findUserById,
    createUser     as insertUser,
    updateUser     as modifyUser,
    deleteUser     as removeUser
} from '../models/userModel.js';

// Se importa getTasksByUserId del modelo de tareas para getUserTasks
import { getTasksByUserId } from '../models/taskModel.js';

// GET /api/users
// Retorna todos los usuarios
// Paulo: router.get('/', getUsers)
// CORREGIDO: se agregó async porque getAllUsers() es una función asíncrona
export async function getUsers(req, res) {
    try {
        // CORREGIDO: se agregó await para esperar el arreglo de usuarios
        // sin await, usuarios sería una Promise y res.json() enviaría {} en lugar del arreglo
        const usuarios = await getAllUsers();
        // 200 OK
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error en getUsers:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
}

// GET /api/users/:id
// Retorna un usuario por su id
// Paulo: router.get('/:id', getUserById)
// CORREGIDO: se agregó async porque findUserById() es una función asíncrona
export async function getUserById(req, res) {
    try {
        const { id } = req.params;
        // CORREGIDO: se agregó await para esperar el resultado de findUserById()
        // sin await, usuario sería una Promise y el if (!usuario) nunca sería true
        const usuario = await findUserById(id);

        if (!usuario) {
            // 404 Not Found: el recurso no existe
            return res.status(404).json({ error: `Usuario con id ${id} no encontrado` });
        }

        res.status(200).json(usuario);
    } catch (error) {
        console.error('Error en getUserById:', error);
        res.status(500).json({ error: 'Error al obtener el usuario' });
    }
}

// POST /api/users
// Crea un usuario nuevo
// Paulo: router.post('/', createUser)
// IMPORTANTE: Karol envía { documento, name, email } desde crearUsuario() en usuariosApi.js
// CORREGIDO: se agregó async porque insertUser() es una función asíncrona
export async function createUser(req, res) {
    try {
        const { documento, name, email } = req.body;

        // Se valida que todos los campos requeridos estén presentes
        if (!documento || !name || !email) {
            // 400 Bad Request: datos incompletos
            return res.status(400).json({ error: 'Los campos documento, name y email son obligatorios' });
        }

        // CORREGIDO: se agregó await para esperar que insertUser() termine de guardar en la BD
        // sin await, nuevoUsuario era una Promise → res.json() enviaba {} en lugar del usuario creado
        // ESTA ERA LA CAUSA DEL {} VACÍO QUE APARECIÓ EN POSTMAN
        const nuevoUsuario = await insertUser({ documento, name, email });

        // 201 Created: recurso creado exitosamente
        res.status(201).json(nuevoUsuario);
    } catch (error) {
        console.error('Error en createUser:', error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
}

// PUT /api/users/:id
// Actualiza los datos de un usuario
// Paulo: router.put('/:id', updateUser)
// CORREGIDO: se agregó async porque modifyUser() es una función asíncrona
export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const campos = req.body;

        // CORREGIDO: se agregó await para esperar el resultado de modifyUser()
        // sin await, usuarioActualizado sería una Promise y el if (!usuarioActualizado) nunca funcionaría
        const usuarioActualizado = await modifyUser(id, campos);

        if (!usuarioActualizado) {
            return res.status(404).json({ error: `Usuario con id ${id} no encontrado` });
        }

        res.status(200).json(usuarioActualizado);
    } catch (error) {
        console.error('Error en updateUser:', error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
}

// DELETE /api/users/:id
// Elimina un usuario
// Paulo: router.delete('/:id', deleteUser)
// IMPORTANTE: Karol llama DELETE /api/users/:id desde eliminarUsuario() en usuariosApi.js
// CORREGIDO: se agregó async porque removeUser() es una función asíncrona
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;
        // CORREGIDO: se agregó await para esperar que removeUser() termine de eliminar en la BD
        // sin await, usuarioEliminado sería una Promise y el if (!usuarioEliminado) nunca funcionaría
        const usuarioEliminado = await removeUser(id);

        if (!usuarioEliminado) {
            return res.status(404).json({ error: `Usuario con id ${id} no encontrado` });
        }

        res.status(200).json({ mensaje: `Usuario "${usuarioEliminado.name}" eliminado correctamente` });
    } catch (error) {
        console.error('Error en deleteUser:', error);
        res.status(500).json({ error: 'Error al eliminar el usuario' });
    }
}

// GET /api/users/:userId/tasks
// Retorna las tareas asignadas a un usuario específico
// Paulo: router.get('/:userId/tasks', getUserTasks)
// CORREGIDO: se agregó async porque getTasksByUserId() es una función asíncrona
export async function getUserTasks(req, res) {
    try {
        const { userId } = req.params;
        // CORREGIDO: se agregó await para esperar el arreglo de tareas
        // sin await, tareas sería una Promise y res.json() enviaría {} en lugar del arreglo
        const tareas = await getTasksByUserId(userId);

        // 200 OK aunque el arreglo esté vacío
        res.status(200).json(tareas);
    } catch (error) {
        console.error('Error en getUserTasks:', error);
        res.status(500).json({ error: 'Error al obtener las tareas del usuario' });
    }
}