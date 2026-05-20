// MÓDULO: middlewares/auth.middleware.js
// CAPA: Middlewares (guardianes de las rutas)
//
// Responsabilidad única: verificar que el token JWT sea válido antes
// de permitir el acceso a cualquier ruta protegida.
//
// REGLA OBLIGATORIA (guía del instructor):
// Los mensajes de error son SIEMPRE en español y en formato JSON.
//   { "error": "Acceso denegado: Token requerido" }
//   { "error": "Acceso denegado: El token ha expirado, inicie sesión nuevamente" }
//   { "error": "Acceso denegado: Token inválido" }
//
// MIDDLEWARES DISPONIBLES:
//   verifyToken              — verifica el JWT en Authorization: Bearer <token>
//   requireAdmin             — verifica que req.usuario.role === 'admin'
//   requireAdminOrInstructor — verifica que role sea 'admin' o 'instructor'
//   requirePermiso(perm)     — verifica que req.usuario.permisos incluya el permiso dado

import jwt from 'jsonwebtoken';

// ── verifyToken ───────────────────────────────────────────────────────────────
// Middleware que protege todas las rutas del backend
// Se registra globalmente en app.js antes de los routers protegidos
// Si el token es válido adjunta req.usuario con el payload decodificado
// El payload contiene: { id, documento, role, permisos, iat, exp }
export function verifyToken(req, res, next) {
    // Leemos el header Authorization que el frontend envía con cada petición protegida
    const authHeader = req.headers['authorization'];

    // Si el header no existe o no empieza con 'Bearer ', el cliente no envió ningún token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // Separamos "Bearer TOKEN" — [1] es el JWT real, [0] es la palabra "Bearer"
    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify verifica la firma contra JWT_SECRET y que no haya expirado
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Adjuntamos el payload al objeto request — contiene id, documento, role, permisos
        req.usuario = payload;

        // Llamamos a next() para que Express continúe al siguiente middleware o controlador
        next();

    } catch (error) {
        // TokenExpiredError: el campo exp del token ya venció
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Acceso denegado: El token ha expirado, inicie sesión nuevamente',
            });
        }
        // JsonWebTokenError u otro error: token alterado, malformado o firma inválida
        return res.status(401).json({ error: 'Acceso denegado: Token inválido' });
    }
}

// ── requireAdmin ──────────────────────────────────────────────────────────────
// Verifica que el usuario autenticado tenga el rol primario 'admin'
// SIEMPRE se usa DESPUÉS de verifyToken — necesita que req.usuario exista
// 403 Forbidden = autenticado pero sin los permisos necesarios
export function requireAdmin(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    if (req.usuario.role !== 'admin') {
        return res.status(403).json({
            error: 'Acceso denegado: Se requieren permisos de administrador para esta acción',
        });
    }

    next();
}

// ── requireAdminOrInstructor ──────────────────────────────────────────────────
// Verifica que el usuario tenga rol primario 'admin' o 'instructor'
// Se usa en endpoints que ambos roles pueden ejecutar (crear tareas, ver usuarios, etc.)
// SIEMPRE se usa DESPUÉS de verifyToken
export function requireAdminOrInstructor(req, res, next) {
    if (!req.usuario) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    const { role } = req.usuario;
    if (role !== 'admin' && role !== 'instructor') {
        return res.status(403).json({
            error: 'Acceso denegado: Se requieren permisos de administrador o instructor para esta acción',
        });
    }

    next();
}

// ── requirePermiso ────────────────────────────────────────────────────────────
// Closure que recibe el código del permiso requerido y retorna un middleware
// Verifica que req.usuario.permisos (arreglo del JWT) incluya el permiso dado
// Es más rápido que checkPermission en authorization.middleware.js porque usa el JWT
// sin consultar la BD, pero refleja los permisos del momento del último login
//
// SIEMPRE se usa DESPUÉS de verifyToken
//
// Uso en rutas:
//   router.delete('/:id', verifyToken, requirePermiso('users.delete'), deleteUser)
//
// Parámetro: permiso — string con el código del permiso requerido
//   Ejemplos: 'tasks.grade', 'users.assign.role', 'tasks.delete.all'
export function requirePermiso(permiso) {
    // Esta función interna es el middleware que Express ejecutará
    return function(req, res, next) {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
        }

        // req.usuario.permisos es el arreglo plano de permisos incluido en el JWT al hacer login
        // Si el JWT no tiene el campo permisos (token anterior al sistema RBAC), denegamos
        if (!Array.isArray(req.usuario.permisos) || !req.usuario.permisos.includes(permiso)) {
            return res.status(403).json({
                error: `Acceso denegado: no tienes el permiso requerido (${permiso})`,
            });
        }

        next();
    };
}

// ── requireAnyPermiso ─────────────────────────────────────────────────────────
// Igual que requirePermiso pero acepta un arreglo de códigos: basta con tener UNO.
// Útil cuando varios roles distintos deben acceder al mismo endpoint con diferentes
// permisos (ej. auditor.usuarios O users.view para ver la lista de usuarios).
//
// Uso en rutas:
//   router.get('/', requireAnyPermiso(['users.view', 'auditor.usuarios']), getUsers)
export function requireAnyPermiso(permisosAceptados) {
    return function(req, res, next) {
        if (!req.usuario) {
            return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
        }

        const permisos = req.usuario.permisos;
        if (!Array.isArray(permisos) || !permisosAceptados.some(p => permisos.includes(p))) {
            return res.status(403).json({
                error: `Acceso denegado: se requiere uno de los permisos: ${permisosAceptados.join(', ')}`,
            });
        }

        next();
    };
}
