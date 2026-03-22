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
} from '../models/users.model.js';

// Se importa getTasksByUserId del modelo de tareas para getUserTasks
import { getTasksByUserId } from '../models/tasks.model.js';

// GET /api/users
// Retorna todos los usuarios
// Paulo: router.get('/', getUsers)
export function getUsers(req, res) {
    try {
        const usuarios = getAllUsers();
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
export function getUserById(req, res) {
    try {
        const { id } = req.params;
        const usuario = findUserById(id);

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
export function createUser(req, res) {
    try {
        const { documento, name, email } = req.body;

        // Se valida que todos los campos requeridos estén presentes
        if (!documento || !name || !email) {
            // 400 Bad Request: datos incompletos
            return res.status(400).json({ error: 'Los campos documento, name y email son obligatorios' });
        }

        const nuevoUsuario = insertUser({ documento, name, email });

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
export function updateUser(req, res) {
    try {
        const { id } = req.params;
        const campos = req.body;

        const usuarioActualizado = modifyUser(id, campos);

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
export function deleteUser(req, res) {
    try {
        const { id } = req.params;
        const usuarioEliminado = removeUser(id);

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
export function getUserTasks(req, res) {
    try {
        const { userId } = req.params;
        const tareas = getTasksByUserId(userId);

        // 200 OK aunque el arreglo esté vacío
        res.status(200).json(tareas);
    } catch (error) {
        console.error('Error en getUserTasks:', error);
        res.status(500).json({ error: 'Error al obtener las tareas del usuario' });
    }
}