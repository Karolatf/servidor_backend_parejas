// MÓDULO: services/auth.service.js
// CAPA: Servicios (lógica de negocio de autenticación)
//
// Responsabilidad única: validar credenciales y emitir tokens JWT.
// NUNCA conoce req, res ni Express.
// Solo importa del modelo y de las librerías de seguridad.

import jwt    from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserByEmail, getUserById } from '../models/user.model.js';

// Rondas de hashing para bcrypt.
// 10 es el estándar recomendado por OWASP: buen balance entre seguridad y velocidad.
const SALT_ROUNDS = 10;

// ── HASHEAR CONTRASEÑA ────────────────────────────────────────────────────────
// Convierte una contraseña en texto plano a un hash irreversible.
// Se usa en el script de semilla y en futuros endpoints de registro.
export async function hashearPassword(passwordPlano) {
    return bcrypt.hash(passwordPlano, SALT_ROUNDS);
}

// ── GENERAR ACCESS TOKEN ──────────────────────────────────────────────────────
// Genera el token de corta duración (1h).
// El payload incluye id, documento y role para que el middleware
// pueda autorizar sin consultar la BD en cada petición.
export function generarAccessToken(usuario) {
    return jwt.sign(
        { id: usuario.id, documento: usuario.documento, role: usuario.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
}

// ── GENERAR REFRESH TOKEN ─────────────────────────────────────────────────────
// Genera el token de larga duración (7d).
// Solo incluye el id para minimizar la información expuesta en el token.
// Paulo lo usa en su endpoint POST /api/auth/refresh.
export function generarRefreshToken(usuario) {
    return jwt.sign(
        { id: usuario.id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
}

// ── LOGIN (VERSIÓN ACTUALIZADA) ──────────────────────────────────────────────
// POST /api/auth/login
// Cuerpo: { email, password }
// Retorna los tokens y datos del usuario, o null si las credenciales son incorrectas.
//
// CAMBIO: antes buscaba por documento, ahora busca por email.
// Esto es coherente con el formulario del frontend que pide email + contraseña.
// El payload del JWT sigue siendo { id, documento, role } para que el frontend
// pueda identificar al usuario sin cambiar la lógica de fetchConAuth.js.
//
// El orden de las propiedades en el objeto de retorno también se ajusta:
// primero accessToken, luego refreshToken, luego user, como pide el cliente.
export async function loginService({ email, password }) {

    // 1. Buscar el usuario por email (cambio respecto a la versión anterior)
    // Se importa getUserByEmail al inicio del archivo en lugar de getUserByDocumento
    const usuario = await getUserByEmail(email);

    // Si el usuario no existe devolvemos null sin revelar si el email existe o no
    // Responder con un mensaje genérico evita ataques de enumeración de usuarios
    if (!usuario) return null;

    // 2. Si el usuario no tiene contraseña configurada no puede iniciar sesión
    // Esto pasa cuando el usuario fue creado manualmente sin hash (como con el script)
    if (!usuario.password) return null;

    // 3. Comparar la contraseña enviada con el hash guardado en la BD
    // bcrypt.compare devuelve true si coinciden, false si no
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecta) return null;

    // 4. Generar los dos tokens con las funciones ya existentes en este mismo archivo
    const accessToken  = generarAccessToken(usuario);
    const refreshToken = generarRefreshToken(usuario);

    // 5. Retornar los datos en el orden que pide el cliente:
    // accessToken primero, refreshToken segundo, user al final
    // El campo password NUNCA se incluye en la respuesta
    return {
        accessToken,
        refreshToken,
        user: {
            id:        usuario.id,
            name:      usuario.name,
            role:      usuario.role,
            documento: usuario.documento,
        },
    };
}

// ── RENOVAR ACCESS TOKEN ──────────────────────────────────────────────────────
// Valida el refreshToken y emite un nuevo accessToken.
// Lo usa el endpoint de Paulo (POST /api/auth/refresh).
export async function renovarAccessTokenService(refreshToken) {
    // Lanza error si la firma es inválida o el token expiró
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Verificar que el usuario sigue existiendo en la BD
    const usuario = await getUserById(payload.id);
    if (!usuario) return null;

    // Emitir un nuevo accessToken con los datos actuales del usuario
    return generarAccessToken(usuario);
}