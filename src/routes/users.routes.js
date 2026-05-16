// MÓDULO: routes/users.routes.js
// CAPA: Rutas (conecta URLs con controladores)
//
// Responsabilidad única: definir qué función del controlador
// maneja cada combinación de método HTTP + ruta de usuarios.
//
// REGLA CRÍTICA DE ORDEN:
//   Express evalúa las rutas en el orden en que están definidas.
//   /by-document/:documento y /:userId/tasks deben ir ANTES de /:id
//   para que Express no interprete "by-document" ni "tasks" como un id numérico.
//
// MONTAJE EN app.js:
//   app.use('/api/users', verifyToken, usersRouter)
//   verifyToken ya está aplicado globalmente — req.usuario está disponible
//   en todos los controladores sin necesidad de repetirlo en cada ruta.

// Importamos Router de express para crear un enrutador modular
// Router permite separar las rutas de usuarios del servidor principal en app.js
import { Router } from 'express';

// Importamos todos los controladores que manejan las operaciones sobre usuarios
// getUsers           — lista todos los usuarios de la BD
// getUserById        — obtiene un usuario específico por su id numérico
// getUserByDocumento — busca un usuario por número de documento de identidad
// createUser         — crea un usuario nuevo sin contraseña inicial
// updateUser         — actualiza los datos de un usuario existente
// deleteUser         — eliminación estándar con restricciones de tareas activas
// forceDeleteUser    — eliminación forzosa sin restricciones de estado ni tareas
// getUserTasks       — lista todas las tareas asignadas a un usuario
// changeUserRole     — cambia el rol de un usuario (admin/instructor/user)
// changeUserPassword — cambia la contraseña del usuario autenticado
// deactivateUser     — desactiva un usuario (is_active = 0) sin eliminarlo
// reactivateUser     — reactiva un usuario previamente desactivado
import {
    getUsers,
    getUserById,
    getUserByDocumento,
    createUser,
    updateUser,
    deleteUser,
    forceDeleteUser,
    getUserTasks,
    changeUserRole,
    changeUserPassword,
    deactivateUser,
    reactivateUser,
} from '../controller/users.controller.js';

// Importamos validateSchema que es el middleware genérico de validación con Zod
// Recibe un schema y retorna un middleware que valida req.body antes de llegar al controlador
import { validateSchema } from '../middlewares/validator.middleware.js';

// Importamos los tres schemas de validación para las operaciones de usuarios
// createUserSchema — valida documento, name y email en POST /api/users
// updateUserSchema — igual que createUserSchema pero todos los campos son opcionales
// changeRoleSchema — valida que role sea 'admin', 'user' o 'instructor'
import {
    createUserSchema,
    updateUserSchema,
    changeRoleSchema,
} from '../../schemas/user.schema.js';

// Importamos los middlewares de autorización por rol
// requireAdmin             — verifica que el usuario autenticado tenga rol 'admin'
// requireAdminOrInstructor — verifica que el usuario tenga rol 'admin' o 'instructor'
import { requireAdmin, requireAdminOrInstructor, verifyToken } from '../middlewares/auth.middleware.js';

// Creamos la instancia del enrutador — este objeto registra todas las rutas de usuarios
// y se monta en app.js bajo el prefijo /api/users
const router = Router();

// ── RUTAS SIN PARÁMETRO DINÁMICO (van PRIMERO) ─────────────────────────────

// GET /api/users — lista todos los usuarios de la BD
// requireAdminOrInstructor verifica que el usuario sea admin o instructor antes de listar
router.get('/', requireAdminOrInstructor, getUsers);

// POST /api/users — crea un usuario nuevo sin contraseña inicial
// requireAdmin verifica que solo el admin pueda crear usuarios desde el panel
// validateSchema(createUserSchema) valida documento, name y email antes de llegar a createUser
router.post('/', requireAdmin, validateSchema(createUserSchema), createUser);

// ── RUTAS CON SEGMENTO FIJO AL FINAL (van ANTES de /:id) ───────────────────

// GET /api/users/by-document/:documento — busca un usuario por número de documento
// Va ANTES de /:id para que Express no interprete "by-document" como un id numérico
// requireAdminOrInstructor garantiza que solo admin e instructor puedan buscar por documento
router.get('/by-document/:documento', requireAdminOrInstructor, getUserByDocumento);

// GET /api/users/:userId/tasks — lista todas las tareas asignadas a un usuario específico
// Va ANTES de /:id para que Express no interprete "tasks" como un id numérico
// requireAdminOrInstructor garantiza que solo admin e instructor vean las tareas de otros usuarios
router.get('/:userId/tasks', requireAdminOrInstructor, getUserTasks);

// ── RUTAS CON PARÁMETRO DINÁMICO /:id (van DESPUÉS de las específicas) ──────

// PATCH /api/users/:id/password — cambia la contraseña del usuario autenticado
// verifyToken se aplica aquí explícitamente para garantizar autenticación en este endpoint
// El controlador verifica que req.usuario.id coincida con req.params.id antes de cambiar
router.patch('/:id/password', verifyToken, changeUserPassword);

// GET /api/users/:id — obtiene un usuario específico por su id numérico
// requireAdminOrInstructor garantiza que solo admin e instructor puedan ver usuarios individuales
router.get('/:id', requireAdminOrInstructor, getUserById);

// PUT /api/users/:id — actualiza los datos de un usuario existente
// requireAdmin garantiza que solo el admin pueda modificar usuarios
// updateUserSchema usa .partial() — el frontend puede enviar solo los campos que cambiaron
router.put('/:id', requireAdmin, validateSchema(updateUserSchema), updateUser);

// PATCH /api/users/:id/deactivate — desactiva un usuario (is_active = 0)
// Solo el admin puede desactivar usuarios — requireAdmin lo verifica
// No elimina el usuario ni sus tareas — solo bloquea su acceso al sistema
router.patch('/:id/deactivate', requireAdmin, deactivateUser);

// PATCH /api/users/:id/reactivate — reactiva un usuario previamente desactivado
// Operación inversa a deactivate — restaura is_active = 1 en la BD
// Solo el admin puede reactivar usuarios — requireAdmin lo verifica
router.patch('/:id/reactivate', requireAdmin, reactivateUser);

// DELETE /api/users/:id — eliminación estándar: solo borra si el usuario no tiene tareas activas
// requireAdmin garantiza que solo el admin pueda eliminar usuarios
// El controlador verifica el estado de las tareas antes de proceder con el DELETE
router.delete('/:id', requireAdmin, deleteUser);

// DELETE /api/users/:id/force — eliminación forzosa sin restricciones de estado ni tareas
// requireAdmin garantiza que solo el admin pueda hacer eliminaciones forzosas
// El controlador requiere body { reason } con al menos 10 caracteres para auditoría
router.delete('/:id/force', requireAdmin, forceDeleteUser);

// PATCH /api/users/:id/role — cambia el rol de un usuario existente
// requireAdmin verifica que solo el admin pueda cambiar roles
// validateSchema(changeRoleSchema) valida que role sea 'admin', 'user' o 'instructor'
router.patch('/:id/role', requireAdmin, validateSchema(changeRoleSchema), changeUserRole);

// Exportamos el enrutador para que app.js lo registre bajo /api/users
export default router;
