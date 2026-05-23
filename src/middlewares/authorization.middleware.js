// MODULO: middlewares/authorization.middleware.js
// CAPA: Middleware de autorizacion (RBAC con consulta en tiempo real)
//
// Responsabilidad unica: verificar que el usuario tiene el permiso requerido
// consultando la BD directamente para reflejar cambios de roles sin re-login.
//
// DIFERENCIA CON auth.middleware.js → requirePermiso:
//   - requirePermiso usa el JWT (rapido, pero refleja permisos del momento del login)
//   - checkPermission consulta la BD (mas lento, pero siempre tiene permisos actuales)
//
// USO RECOMENDADO:
//   - requirePermiso: para rutas de alta frecuencia donde el rendimiento importa
//   - checkPermission: para operaciones destructivas donde urge que los permisos sean en tiempo real

import { getUserRolesAndPermissions } from '../models/user.model.js';

// ── checkPermission ───────────────────────────────────────────────────────────
// Closure que recibe el codigo del permiso requerido y retorna un middleware
// Consulta los roles del usuario en la BD para verificar el permiso en tiempo real
//
// Parametro: permiso  string con el codigo del permiso requerido
//   Ejemplos: 'tasks.delete.all', 'users.assign.role', 'tasks.create'
export function checkPermission(permiso) {
    // Esta funcion interna es el middleware que Express ejecutara para cada peticion
    return async function(req, res, next) {

        // req.usuario fue adjuntado por verifyToken (que debe ejecutarse antes)
        if (!req.usuario || !req.usuario.id) {
            return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
        }

        // Consultamos los roles y permisos del usuario directamente en la BD
        // Esto garantiza que los cambios de roles se reflejen sin necesidad de re-login
        const rolesDelUsuario = await getUserRolesAndPermissions(req.usuario.id);

        // Fallback: si el usuario no tiene filas en user_roles (DB antes del seed.sql)
        // usamos el campo role del JWT para compatibilidad
        if (!rolesDelUsuario || rolesDelUsuario.length === 0) {
            // Un admin sin user_roles configurado tiene acceso total como fallback temporal
            if (req.usuario.role === 'admin') return next();
            return res.status(403).json({
                error: `Acceso denegado: no tienes el permiso requerido (${permiso})`,
            });
        }

        // Verificamos si AL MENOS UNO de los roles del usuario tiene el permiso requerido
        // .some() retorna true en cuanto encuentra un rol con el permiso  no sigue buscando
        const tienePermiso = rolesDelUsuario.some(function(rol) {
            return Array.isArray(rol.permissions) && rol.permissions.includes(permiso);
        });

        if (!tienePermiso) {
            return res.status(403).json({
                error: `Acceso denegado: no tienes el permiso requerido (${permiso})`,
            });
        }

        next();
    };
}
