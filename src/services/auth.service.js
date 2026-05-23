// MODULO: services/auth.service.js
// CAPA: Servicios (logica de negocio de autenticacion)
//
// Responsabilidad unica: validar credenciales y emitir tokens JWT.
// NUNCA conoce req, res ni Express.
// Solo importa del modelo y de las librerias de seguridad.

// Importamos jwt para firmar y verificar los tokens de sesion (JSON Web Tokens)
import jwt    from 'jsonwebtoken';
// Importamos bcrypt para hashear contrasenas y compararlas de forma segura
import bcrypt from 'bcryptjs';
// Importamos las funciones del modelo de usuarios que necesitamos para el login y registro
import {
    getUserByEmail,
    getUserById,
    getUserByDocumento,
    createUserWithPassword,
    getUserRolesAndPermissions,   // trae roles y permisos del sistema RBAC del usuario
} from '../models/user.model.js';

// Definimos las rondas de hashing para bcrypt  10 es el estandar OWASP recomendado
// Mas rondas = mas seguro pero mas lento; 10 es un buen balance para proyectos de este nivel
const SALT_ROUNDS = 10;

// ── hashearPassword ───────────────────────────────────────────────────────────
// Recibe una contrasena en texto plano y retorna el hash generado por bcrypt
// El resultado es un string de ~60 caracteres que incluye el salt embebido automaticamente
export async function hashearPassword(passwordPlano) {
    return bcrypt.hash(passwordPlano, SALT_ROUNDS);
}

// ── generarAccessToken ────────────────────────────────────────────────────────
// Genera el token de corta duracion (1h) firmado con JWT_SECRET
// El payload incluye: id, documento, role (primario) y permisos (arreglo plano)
// Los permisos en el JWT permiten autorizar sin consultar la BD en cada peticion
//
// Parametro: usuario  objeto del usuario desde la BD
// Parametro: permisos  arreglo plano de codigos de permiso ['tasks.create', 'users.view', ...]
export function generarAccessToken(usuario, permisos = []) {
    return jwt.sign(
        // payload: datos que viajan dentro del token  nunca informacion sensible como password
        {
            id:        usuario.id,
            documento: usuario.documento,
            role:      usuario.role,      // rol primario para selección de vista SPA
            permisos,                     // arreglo plano de todos los permisos acumulados
        },
        // secret: clave del .env con la que se firma el token  solo el servidor la conoce
        process.env.JWT_SECRET,
        // options: el token vence en 1 hora  el cliente lo renueva con el refreshToken
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
}

// ── generarRefreshToken ───────────────────────────────────────────────────────
// Genera el token de larga duracion (7d) firmado con JWT_REFRESH_SECRET
// Solo incluye el id para minimizar la informacion expuesta en el token de larga vida
export function generarRefreshToken(usuario) {
    return jwt.sign(
        // payload minimo: solo el id  suficiente para identificar al usuario al renovar
        { id: usuario.id },
        // secret diferente al del accessToken  firmados de forma independiente por seguridad
        process.env.JWT_REFRESH_SECRET,
        // options: vence en 7 dias  el usuario re-logea solo una vez por semana
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
    );
}

// ── loginService ──────────────────────────────────────────────────────────────
// Verifica las credenciales del usuario y genera los tokens de sesion
// Retorna los tokens y datos del usuario si todo es correcto, o null si falla
export async function loginService({ email, password }) {

    // Buscamos el usuario en la BD por su email  retorna el objeto completo o undefined
    const usuario = await getUserByEmail(email);

    // Si el usuario no existe en la BD, retornamos null  el controlador responde 401
    if (!usuario) return null;
    // Si no tiene contrasena hasheada (fue creado por admin sin password), retornamos null
    if (!usuario.password) return null;

    // Verificamos que la cuenta no este marcada como eliminada (soft delete)
    // deleted_at IS NOT NULL significa que el admin la elimino pero aun no expiro el plazo de 30 dias
    if (usuario.deleted_at !== null && usuario.deleted_at !== undefined) {
        const errorEliminado = new Error(
            'Tu cuenta ha sido eliminada. Contacta al administrador del sistema.'
        );
        errorEliminado.code   = 'ACCOUNT_DELETED';
        errorEliminado.status = 403;
        throw errorEliminado;
    }

    // Verificamos que la cuenta este activa antes de permitir el inicio de sesion
    // is_active = 0 significa que el admin desactivo esta cuenta manualmente
    if (usuario.is_active === 0 || usuario.is_active === false) {
        const errorDesactivado = new Error(
            'Tu cuenta ha sido desactivada. Comunícate con el administrador del sistema.'
        );
        // code identifica este error para que errorMiddleware lo trate aparte
        errorDesactivado.code   = 'ACCOUNT_DISABLED';
        errorDesactivado.status = 403;
        throw errorDesactivado;
    }

    // Comparamos la contrasena del formulario con el hash guardado en la BD
    const passwordCorrecta = await bcrypt.compare(password, usuario.password);
    if (!passwordCorrecta) return null;

    // Consultamos los roles y permisos del sistema RBAC para incluirlos en el JWT
    const rolesConPermisos = await getUserRolesAndPermissions(usuario.id);

    // Computamos el arreglo plano de permisos acumulando todos los roles del usuario
    // Set elimina duplicados en caso de que varios roles compartan el mismo permiso
    const permisosSet = new Set();
    rolesConPermisos.forEach(function(rol) {
        (rol.permissions || []).forEach(p => permisosSet.add(p));
    });
    const permisos = Array.from(permisosSet);

    // Generamos los tokens incluyendo el arreglo de permisos en el accessToken
    const accessToken  = generarAccessToken(usuario, permisos);
    const refreshToken = generarRefreshToken(usuario);

    // Retornamos los tokens y los datos del usuario  sin el campo password por seguridad
    return {
        accessToken,
        refreshToken,
        user: {
            id:        usuario.id,
            name:      usuario.name,
            role:      usuario.role,
            documento: usuario.documento,
            email:     usuario.email,
            // permisos en el objeto user para que el frontend adapte la UI sin esperar el JWT
            permisos,
            // roles: nombres de todos los roles asignados para mostrar en el panel de perfil
            roles:     rolesConPermisos.map(r => r.name),
        },
        // roles completos con sus permisos  util para el panel de gestion de roles en admin
        roles: rolesConPermisos,
    };
}

// ── renovarAccessTokenService ─────────────────────────────────────────────────
// Recibe el refreshToken del cliente y genera un nuevo accessToken de 1h
// Re-consulta los permisos desde la BD para que el token renovado este actualizado
export async function renovarAccessTokenService(refreshToken) {
    // Verificamos la firma del refreshToken  lanza error si es invalido o expiro
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Verificamos que el usuario siga existiendo en la BD
    const usuario = await getUserById(payload.id);
    if (!usuario) return null;

    // Re-consultamos los permisos para reflejar cambios de roles desde el ultimo login
    const rolesConPermisos = await getUserRolesAndPermissions(usuario.id);
    const permisosSet      = new Set();
    rolesConPermisos.forEach(function(rol) {
        (rol.permissions || []).forEach(p => permisosSet.add(p));
    });
    const permisos = Array.from(permisosSet);

    // Retornamos el nuevo accessToken con los permisos actualizados
    return generarAccessToken(usuario, permisos);
}

// ── registerService ───────────────────────────────────────────────────────────
// Crea el usuario nuevo en la BD despues de verificar duplicados y hashear la contrasena
// Retorna { error, codigo } si hay un conflicto, o { usuario } si el registro fue exitoso
export async function registerService({ name, documento, email, password }) {

    // Verificamos que el email no este ya registrado
    const usuarioPorEmail = await getUserByEmail(email);
    if (usuarioPorEmail) {
        return { error: 'El correo electrónico ya está registrado en el sistema', codigo: 409 };
    }

    // Verificamos que el numero de documento no este ya registrado
    const usuarioPorDocumento = await getUserByDocumento(documento);
    if (usuarioPorDocumento) {
        return { error: 'El número de documento ya está registrado en el sistema', codigo: 409 };
    }

    // Hasheamos la contrasena con bcrypt antes de guardarla  NUNCA texto plano en la BD
    const passwordHasheada = await hashearPassword(password);

    // Creamos el usuario con rol 'user' por defecto
    // createUserWithPassword tambien agrega el rol a user_roles para el sistema RBAC
    const usuarioCreado = await createUserWithPassword({
        name,
        documento,
        email,
        password: passwordHasheada,
        role: 'user',
    });

    // Excluimos el campo password del objeto antes de retornarlo al controlador
    const { password: _ignorado, ...usuarioSinPassword } = usuarioCreado;
    return { usuario: usuarioSinPassword };
}
