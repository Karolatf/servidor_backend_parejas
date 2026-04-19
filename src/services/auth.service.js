// MÓDULO: services/auth.service.js
// CAPA: Servicios (lógica de negocio de autenticación)
//
// Responsabilidad única: validar credenciales y emitir tokens JWT.
// NUNCA conoce req, res ni Express.
// Solo importa del modelo y de las librerías de seguridad.

import jwt    from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getUserByDocumento, getUserById } from '../models/user.model.js';

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

// ── LOGIN ─────────────────────────────────────────────────────────────────────
// Valida las credenciales y retorna los tokens si son correctas.
// Retorna null si el documento no existe o la contraseña no coincide.
// El controlador decide el código HTTP — este servicio solo retorna datos.
export async function loginService({ documento, password }) {
    // 1. Buscar el usuario por documento
    const usuario = await getUserByDocumento(documento);

    // Si el usuario no existe devolvemos null sin revelar si el documento existe o no
    if (!usuario) return null;

    // 2. Si el usuario no tiene contraseña configurada, no puede iniciar sesión
    if (!usuario.password) return null;

    // 3. Comparar la contraseña enviada con el hash guardado en la BD
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecta) return null;

    // 4. Generar los dos tokens
    const accessToken  = generarAccessToken(usuario);
    const refreshToken = generarRefreshToken(usuario);

    // 5. Retornar tokens y datos públicos del usuario (nunca la contraseña)
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