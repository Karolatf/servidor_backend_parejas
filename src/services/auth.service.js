// MÓDULO: services/auth.service.js
// CAPA: Servicios (lógica de negocio de autenticación)
//
// Responsabilidad única: validar credenciales y emitir tokens JWT.
// NUNCA conoce req, res ni Express.
// Solo importa del modelo y de las librerías de seguridad.

// Importamos jwt para firmar y verificar los tokens de sesión (JSON Web Tokens)
import jwt    from 'jsonwebtoken';
// Importamos bcrypt para hashear contraseñas y compararlas de forma segura
import bcrypt from 'bcryptjs';
// Importamos las funciones del modelo de usuarios que necesitamos para el login y registro
import {
    getUserByEmail,
    getUserById,
    getUserByDocumento,
    createUserWithPassword,
    getUserRolesAndPermissions,   // traer los roles y permisos del sistema RBAC del usuario
} from '../models/user.model.js';

// Definimos las rondas de hashing para bcrypt — 10 es el estándar OWASP recomendado
// Más rondas = más seguro pero más lento; 10 es un buen balance para proyectos como este
const SALT_ROUNDS = 10;

// ── hashearPassword ───────────────────────────────────────────────────────────
// Exportamos la función hashearPassword que recibe una contraseña en texto plano
// y retorna el hash generado por bcrypt para guardar de forma segura en la BD
export async function hashearPassword(passwordPlano) {
    // Llamamos a bcrypt.hash que aplica el algoritmo de hashing con las 10 rondas configuradas
    // El resultado es un string de ~60 caracteres que incluye el salt embebido automáticamente
    return bcrypt.hash(passwordPlano, SALT_ROUNDS);
}

// ── generarAccessToken ────────────────────────────────────────────────────────
// Exportamos la función generarAccessToken que recibe el objeto usuario
// y retorna el token de corta duración (1h) firmado con JWT_SECRET
// El payload incluye id, documento y role para que el middleware autorice sin consultar la BD
export function generarAccessToken(usuario) {
    return jwt.sign(
        // payload: datos que viajan dentro del token — no incluimos información sensible como password
        { id: usuario.id, documento: usuario.documento, role: usuario.role },
        // secret: clave del .env con la que se firma el token — solo el servidor la conoce
        process.env.JWT_SECRET,
        // options: el token vence en 1 hora — el cliente debe renovarlo con el refreshToken
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
}

// ── generarRefreshToken ───────────────────────────────────────────────────────
// Exportamos la función generarRefreshToken que recibe el objeto usuario
// y retorna el token de larga duración (7d) firmado con JWT_REFRESH_SECRET
// Solo incluye el id para minimizar la información expuesta en el token de larga vida
export function generarRefreshToken(usuario) {
    return jwt.sign(
        // payload mínimo: solo el id — suficiente para identificar al usuario al renovar el accessToken
        { id: usuario.id },
        // secret diferente al del accessToken — firmados de forma independiente por seguridad
        process.env.JWT_REFRESH_SECRET,
        // options: el token vence en 7 días — el usuario re-logea solo una vez por semana
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
}

// ── loginService ──────────────────────────────────────────────────────────────
// Exportamos la función loginService que recibe el email y la contraseña del formulario de login
// y verifica las credenciales del usuario contra la base de datos
// Retorna los tokens y datos del usuario si todo es correcto, o null si las credenciales son incorrectas
export async function loginService({ email, password }) {

    // Buscamos el usuario en la BD por su email — retorna el objeto completo o undefined si no existe
    const usuario = await getUserByEmail(email);

    // Si el usuario no existe en la BD retornamos null — el controlador responde 401
    if (!usuario) return null;
    // Si el usuario no tiene contraseña hasheada (fue creado por admin sin password) retornamos null
    if (!usuario.password) return null;

    // Verificamos que la cuenta esté activa antes de permitir el inicio de sesión
    // is_active = 0 significa que el admin desactivó esta cuenta manualmente
    if (usuario.is_active === 0 || usuario.is_active === false) {
        // Creamos un Error con propiedades específicas que errorMiddleware sabe leer
        const errorDesactivado = new Error(
            'Tu cuenta ha sido desactivada. Comunícate con el administrador del sistema.'
        );
        // code identifica este error específicamente para que errorMiddleware lo trate aparte
        errorDesactivado.code   = 'ACCOUNT_DISABLED';
        // status (sin "Code") es la propiedad que errorMiddleware lee para el código HTTP
        errorDesactivado.status = 403;
        // Lanzamos el error para que catchAsync lo capture y lo pase al middleware global
        throw errorDesactivado;
    }

    // Comparamos la contraseña que llegó del formulario con el hash guardado en la BD
    // bcrypt.compare retorna true si coinciden, false si la contraseña es incorrecta
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    // Si la contraseña no coincide, retornamos null — el controlador responde 401
    if (!passwordCorrecta) return null;

    // Generamos el accessToken de 1h con los datos actuales del usuario
    const accessToken  = generarAccessToken(usuario);
    // Generamos el refreshToken de 7d que el cliente usará para renovar el accessToken
    const refreshToken = generarRefreshToken(usuario);

    // Consultamos los roles y permisos del sistema RBAC para incluirlos en la respuesta
    // Los consultamos desde la BD (no del JWT) para reflejar cambios en tiempo real sin re-login
    const roles = await getUserRolesAndPermissions(usuario.id);

    // Retornamos los tokens y los datos del usuario — sin el campo password por seguridad
    return {
        accessToken,
        refreshToken,
        user: {
            id:        usuario.id,
            name:      usuario.name,
            role:      usuario.role,
            documento: usuario.documento,
            email:     usuario.email,
        },
        // roles: arreglo de objetos { name, permissions: [] } para que el frontend adapte la UI
        roles,
    };
}

// ── renovarAccessTokenService ─────────────────────────────────────────────────
// Exportamos la función renovarAccessTokenService que recibe el refreshToken del cliente
// y genera un nuevo accessToken de 1h si el refreshToken es válido y el usuario sigue existiendo
export async function renovarAccessTokenService(refreshToken) {
    // Verificamos la firma del refreshToken con JWT_REFRESH_SECRET — lanza error si es inválido o expiró
    // payload contiene los datos del token: { id, iat, exp }
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Verificamos que el usuario del token siga existiendo en la BD — pudo haber sido eliminado
    const usuario = await getUserById(payload.id);
    // Si el usuario ya no existe en la BD, retornamos null — el cliente debe hacer login completo
    if (!usuario) return null;

    // Generamos y retornamos el nuevo accessToken con los datos actuales del usuario desde la BD
    return generarAccessToken(usuario);
}

// ── registerService ───────────────────────────────────────────────────────────
// Exportamos la función registerService que recibe los datos del formulario de registro
// y crea el usuario nuevo en la BD después de verificar duplicados y hashear la contraseña
// Retorna { error, codigo } si hay un conflicto, o { usuario } si el registro fue exitoso
export async function registerService({ name, documento, email, password }) {

    // Verificamos que el email no esté ya registrado en la BD
    const usuarioPorEmail = await getUserByEmail(email);
    if (usuarioPorEmail) {
        // Retornamos un objeto de error en lugar de lanzar excepción — el controlador responde 409
        return { error: 'El correo electrónico ya está registrado en el sistema', codigo: 409 };
    }

    // Verificamos que el número de documento no esté ya registrado en la BD
    const usuarioPorDocumento = await getUserByDocumento(documento);
    if (usuarioPorDocumento) {
        // Mismo patrón — retornamos objeto de error con código 409 (Conflicto)
        return { error: 'El número de documento ya está registrado en el sistema', codigo: 409 };
    }

    // Hasheamos la contraseña con bcrypt antes de guardarla — NUNCA texto plano en la BD
    // hashearPassword usa SALT_ROUNDS = 10 definido al inicio de este archivo
    const passwordHasheada = await hashearPassword(password);

    // Creamos el usuario en MySQL con la contraseña ya hasheada y el rol 'user' por defecto
    // Solo un admin puede cambiar el rol después del registro
    const usuarioCreado = await createUserWithPassword({
        name,
        documento,
        email,
        password: passwordHasheada,   // guardamos el hash, nunca el texto plano
        role: 'user',
    });

    // Excluimos el campo password del objeto antes de retornarlo al controlador
    // La desestructuración con alias (_ignorado) descarta password del objeto de retorno
    const { password: _ignorado, ...usuarioSinPassword } = usuarioCreado;
    // Retornamos el objeto de éxito con el usuario ya sin el campo password
    return { usuario: usuarioSinPassword };
}
