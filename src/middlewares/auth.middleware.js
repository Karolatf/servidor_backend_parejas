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

// Importamos jsonwebtoken para poder verificar la firma y la expiración del token JWT
import jwt from 'jsonwebtoken';

// ── verifyToken ───────────────────────────────────────────────────────────────
// Exportamos verifyToken que es el middleware que protege todas las rutas del backend
// Se registra como segundo argumento en cada ruta que requiere autenticación:
//   router.get('/api/tasks', verifyToken, tasksController)
// Express lo ejecuta ANTES del controlador cada vez que llega una petición a esa ruta
//
// Si el token es válido adjunta req.usuario con el payload decodificado
// y llama a next() para que la petición continúe al controlador
export function verifyToken(req, res, next) {
    // Leemos el header Authorization que el frontend envía con cada petición protegida
    // El formato estándar es: "Bearer eyJhbGci..."
    const authHeader = req.headers['authorization'];

    // Si el header no existe o no empieza con 'Bearer ', el cliente no envió ningún token
    // Respondemos 401 Unauthorized — el cliente no está identificado aún
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // Separamos "Bearer TOKEN" por el espacio — [1] es el token JWT real, [0] es la palabra "Bearer"
    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify hace dos verificaciones en una sola llamada:
        //   1. Verifica que la firma del token coincida con JWT_SECRET del .env
        //   2. Verifica que el token no haya expirado (campo exp del payload)
        // Si cualquiera de las dos falla, lanza un error y cae al catch
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Llegamos aquí porque el token es válido — adjuntamos el payload al objeto request
        // El payload contiene: { id, documento, role, iat, exp }
        // Los controladores acceden a req.usuario.id y req.usuario.role en su lógica
        req.usuario = payload;

        // Llamamos a next() para que Express continúe al siguiente middleware o al controlador
        // Sin llamar a next() la petición quedaría bloqueada sin enviar respuesta al cliente
        next();

    } catch (error) {
        // TokenExpiredError es el error específico de jwt cuando el campo exp ya venció
        // El cliente debe hacer login de nuevo para obtener un token fresco
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Acceso denegado: El token ha expirado, inicie sesión nuevamente',
            });
        }
        // JsonWebTokenError u otro error: el token fue alterado, malformado o tiene firma inválida
        return res.status(401).json({ error: 'Acceso denegado: Token inválido' });
    }
}

// ── requireAdmin ──────────────────────────────────────────────────────────────
// Exportamos requireAdmin que es el middleware que verifica que el usuario autenticado sea admin
// SIEMPRE se usa DESPUÉS de verifyToken — nunca solo porque necesita que req.usuario exista
// Ejemplo: router.patch('/:id/role', verifyToken, requireAdmin, changeUserRole)
//
// 403 Forbidden significa "autenticado pero sin los permisos necesarios"
// Es distinto a 401 que significa "no autenticado en absoluto"
export function requireAdmin(req, res, next) {

    // Verificamos que req.usuario exista — debería haberlo puesto verifyToken antes
    // Este guard evita un crash si alguien usa requireAdmin sin verifyToken en la cadena
    if (!req.usuario) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // Leemos el role del payload del JWT — fue generado en el login con los datos del usuario
    // Solo los usuarios con role === 'admin' pueden pasar este guardia
    if (req.usuario.role !== 'admin') {
        // El usuario está autenticado pero no tiene rol de admin — respondemos 403
        return res.status(403).json({
            error: 'Acceso denegado: Se requieren permisos de administrador para esta acción',
        });
    }

    // El usuario es admin — llamamos a next() para que continúe al controlador
    next();
}

// ── requireAdminOrInstructor ──────────────────────────────────────────────────
// Exportamos requireAdminOrInstructor que permite el acceso solo a admin e instructor
// Se usa en endpoints que ambos roles pueden ejecutar (listar usuarios, crear tareas, etc.)
// SIEMPRE se usa DESPUÉS de verifyToken (app.js lo aplica globalmente en /api/*)
export function requireAdminOrInstructor(req, res, next) {
    // Verificamos que req.usuario exista — debería haberlo puesto verifyToken antes
    if (!req.usuario) {
        // Si req.usuario no existe, el token no fue verificado — respondemos 401
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // Leemos el role del payload del JWT para verificar qué tipo de usuario es
    const { role } = req.usuario;
    // Si el rol no es ni admin ni instructor, el usuario no tiene permisos para esta ruta
    if (role !== 'admin' && role !== 'instructor') {
        // Respondemos 403 — autenticado pero sin los permisos de admin o instructor
        return res.status(403).json({
            error: 'Acceso denegado: Se requieren permisos de administrador o instructor para esta acción',
        });
    }

    // El rol es admin o instructor — llamamos a next() para continuar al controlador
    next();
}
