// MÓDULO: controller/users.controller.js
// CAPA: Controlador (recibe HTTP, llama el modelo, responde HTTP)

// Responsabilidad única: manejar las peticiones HTTP de usuarios.
// NUNCA maneja datos directamente — solo recibe req, llama el modelo y responde res.

import {
    getAllUsers,
    getUserById    as findUserById,
    createUser     as insertUser,
    updateUser     as modifyUser,
    deleteUser     as removeUser
} from '../models/user.model.js';

import { getTasksByUserId } from '../models/task.model.js';

// GET /api/users
// Retorna todos los usuarios
export async function getUsers(req, res) {
    try {
        const usuarios = await getAllUsers();
        res.status(200).json(usuarios);
    } catch (error) {
        console.error('Error en getUsers:', error);
        res.status(500).json({ error: 'Error al obtener los usuarios' });
    }
}

// GET /api/users/:id
// Retorna un usuario por su id
export async function getUserById(req, res) {
    try {
        const { id } = req.params;
        const usuario = await findUserById(id);

        if (!usuario) {
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
// Cuerpo: { documento, name, email }
export async function createUser(req, res) {
    try {
        const { documento, name, email } = req.body;

        if (!documento || !name || !email) {
            return res.status(400).json({ error: 'Los campos documento, name y email son obligatorios' });
        }

        const nuevoUsuario = await insertUser({ documento, name, email });
        res.status(201).json(nuevoUsuario);
    } catch (error) {
        console.error('Error en createUser:', error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
}

// PUT /api/users/:id
// Actualiza los datos de un usuario existente
// El modelo solo permite actualizar: documento, name, email
export async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const campos = req.body;

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
export async function deleteUser(req, res) {
    try {
        const { id } = req.params;
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
// Retorna todas las tareas asignadas a un usuario específico
export async function getUserTasks(req, res) {
    try {
        const { userId } = req.params;
        const tareas = await getTasksByUserId(userId);
        res.status(200).json(tareas);
    } catch (error) {
        console.error('Error en getUserTasks:', error);
        res.status(500).json({ error: 'Error al obtener las tareas del usuario' });
    }
}