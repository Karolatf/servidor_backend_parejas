// MODULO: middlewares/auth.middleware.js
// CAPA: Middlewares (guardianes de las rutas)
//
// Responsabilidad unica: verificar que el token JWT sea valido antes
// de permitir el acceso a cualquier ruta protegida.
//
// REGLA OBLIGATORIA (guia del instructor):
// Los mensajes de error son SIEMPRE en espanol y en formato JSON.
//   { "error": "Acceso denegado: Token requerido" }
//   { "error": "Acceso denegado: El token ha expirado, inicie sesion nuevamente" }
//   { "error": "Acceso denegado: Token invalido" }
//
// MIDDLEWARES DISPONIBLES:
//   verifyToken               verifica el JWT en Authorization: Bearer <token>
//   requireAdmin              verifica que req.usuario.role === 'admin'
//   requireAdminOrInstructor  verifica que role sea 'admin' o 'instructor'
//   requirePermiso(perm)      verifica que req.usuario.permisos incluya el permiso dado

import jwt from 'jsonwebtoken';

// ── verifyToken ───────────────────────────────────────────────────────────────
// Middleware que protege todas las rutas del backend
// Se registra globalmente en app.js antes de los routers protegidos
// Si el token es valido adjunta req.usuario con el payload decodificado
// El payload contiene: { id, documento, role, permisos, iat, exp }
export function verifyToken(req, res, next) {
    // Leemos el header Authorization que el frontend envia con cada peticion protegida
    const authHeader = req.headers['authorization'];

    // Si el header no existe o no empieza con 'Bearer ', el cliente no envio ningun token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // Separamos "Bearer TOKEN"  [1] es el JWT real, [0] es la palabra "Bearer"
    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify verifica la firma contra JWT_SECRET y que no haya expirado
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Adjuntamos el payload al objeto request  contiene id, documento, role, permisos
        req.usuario = payload;

        // Llamamos a next() para que Express continue al siguiente middleware o controlador
        next();

    } catch (error) {
        // TokenExpiredError: el campo exp del token ya vencio
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Acceso denegado: El token ha expirado, inicie sesión nuevamente',
            });
        }
        // JsonWebTokenError u otro error: token alterado, malformado o firma invalida
        return res.status(401).json({ error: 'Acceso denegado: Token inválido' });
    }
}

// ── requireAdmin ──────────────────────────────────────────────────────────────
// Verifica que el usuario autenticado tenga el rol primario 'admin'
// SIEMPRE se usa DESPUES de verifyToken  necesita que req.usuario exista
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
// SIEMPRE se usa DESPUES de verifyToken
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
// Closure que recibe el codigo del permiso requerido y retorna un middleware
// Verifica que req.usuario.permisos (arreglo del JWT) incluya el permiso dado
// Es mas rapido que checkPermission en authorization.middleware.js porque usa el JWT
// sin consultar la BD, pero refleja los permisos del momento del ultimo login
//
// SIEMPRE se usa DESPUES de verifyToken
//
// Uso en rutas:
//   router.delete('/:id', verifyToken, requirePermiso('users.delete'), deleteUser)
//
// Parametro: permiso  string con el codigo del permiso requerido
//   Ejemplos: 'tasks.grade', 'users.assign.role', 'tasks.delete.all'
export function requirePermiso(permiso) {
    // Esta funcion interna es el middleware que Express ejecutara
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
// Igual que requirePermiso pero acepta un arreglo de codigos: basta con tener UNO.
// Util cuando varios roles distintos deben acceder al mismo endpoint con diferentes
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
