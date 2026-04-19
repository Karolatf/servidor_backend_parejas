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

import jwt from 'jsonwebtoken';

// verifyToken — se agrega como segundo argumento en las rutas a proteger:
//   app.use('/api/tasks', verifyToken, tasksRouter)
//
// Si el token es válido adjunta req.usuario con el payload decodificado
// y llama a next() para continuar a la ruta.
export function verifyToken(req, res, next) {
    // El token viaja en el header: Authorization: Bearer <token>
    const authHeader = req.headers['authorization'];

    // Si no viene el header o no tiene el formato "Bearer ..." se deniega el acceso
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado: Token requerido' });
    }

    // Se extrae solo el token (la parte después del espacio de "Bearer ")
    const token = authHeader.split(' ')[1];

    try {
        // jwt.verify lanza un error si el token es inválido o expiró
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // Se adjunta el payload al request para que los controladores lo usen
        // Ejemplo de uso en un controlador: const { id, role } = req.usuario;
        req.usuario = payload;

        // Token válido — continuar al siguiente middleware o ruta
        next();

    } catch (error) {
        // TokenExpiredError se lanza cuando el tiempo de vida del token venció
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Acceso denegado: El token ha expirado, inicie sesión nuevamente',
            });
        }
        // Cualquier otro error: firma inválida, token malformado, etc.
        return res.status(401).json({ error: 'Acceso denegado: Token inválido' });
    }
}