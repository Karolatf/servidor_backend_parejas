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

// jsonwebtoken es la librería que permite firmar y verificar tokens JWT
// Se usa jwt.verify() para comprobar que el token no fue alterado y no expiró
import jwt from 'jsonwebtoken';

// verifyToken — middleware que protege rutas del backend
// Se registra como segundo argumento en las rutas que requieren autenticación:
//   router.get('/api/tasks', verifyToken, tasksController)
// Express lo ejecuta ANTES del controlador cada vez que llega una petición
//
// Si el token es válido adjunta req.usuario con el payload decodificado
// y llama a next() para continuar al controlador.
export function verifyToken(req, res, next) {
    // req.headers['authorization'] contiene el valor del header Authorization
    // El frontend lo envía con el formato estándar: "Bearer eyJhbGci..."
    const authHeader = req.headers['authorization'];

    // Si el header no existe o no empieza con 'Bearer ', el cliente no envió token
    // Respondemos 401 Unauthorized — el cliente no está identificado
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // authHeader es "Bearer TOKEN" — split(' ')[1] extrae solo el TOKEN
    // el índice [0] sería "Bearer" y [1] es el token JWT real
    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify hace dos cosas a la vez:
        //   1. Verifica que la firma del token coincida con JWT_SECRET del .env
        //   2. Verifica que el token no haya expirado (campo exp del payload)
        // Si cualquiera de las dos falla, lanza un error y va al catch
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Si llegamos aquí el token es válido — adjuntamos el payload al request
        // El payload contiene: { id, documento, role, iat, exp }
        // Los controladores acceden a req.usuario.id y req.usuario.role
        req.usuario = payload;

        // next() le dice a Express que continúe al siguiente middleware o controlador
        // Sin llamar a next() la petición quedaría colgada sin respuesta
        next();

    } catch (error) {
        // TokenExpiredError es el error específico de jsonwebtoken cuando el token expiró
        // El campo exp del payload venció — el usuario debe hacer login de nuevo
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Acceso denegado: El token ha expirado, inicie sesión nuevamente',
            });
        }
        // Cualquier otro error significa que el token fue alterado o es inválido
        // JsonWebTokenError cubre firma incorrecta, token malformado, etc.
        return res.status(401).json({ error: 'Acceso denegado: Token inválido' });
    }
}

// requireAdmin — middleware que verifica que el usuario autenticado sea admin
// SIEMPRE se usa DESPUÉS de verifyToken, nunca solo
// Ejemplo de uso: router.patch('/:id/role', verifyToken, requireAdmin, changeUserRole)
//
// verifyToken ya verificó la firma del JWT y adjuntó req.usuario al request.
// requireAdmin solo verifica que req.usuario.role sea 'admin'.
//
// 403 Forbidden significa "autenticado pero sin permisos"
// Es distinto a 401 que significa "no autenticado"
export function requireAdmin(req, res, next) {

    // req.usuario fue adjuntado por verifyToken — si no existe algo falló en el orden
    // Este guard evita un crash si se usa requireAdmin sin verifyToken antes
    if (!req.usuario) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // El campo role viene del payload del JWT que se generó en el login
    // Solo los usuarios con role === 'admin' pueden pasar este guard
    if (req.usuario.role !== 'admin') {
        // 403 Forbidden: el usuario está autenticado pero no tiene permisos de admin
        return res.status(403).json({
            error: 'Acceso denegado: Se requieren permisos de administrador para esta acción',
        });
    }

    // El usuario es admin — continuar al controlador de la ruta
    next();
}

// requireAdminOrInstructor — permite el acceso solo a admin e instructor
// Se usa en endpoints que ambos roles pueden usar (ej: listar usuarios, crear tareas)
// SIEMPRE se usa DESPUÉS de verifyToken (app.js lo aplica globalmente a /api/*)
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