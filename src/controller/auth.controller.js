// MÓDULO: controller/auth.controller.js
// CAPA: Controlador (recibe HTTP, llama el servicio, responde HTTP)
//
// Responsabilidad única: manejar las peticiones HTTP de autenticación.
// NUNCA contiene lógica de negocio — eso va en auth.service.js.

// Importamos catchAsync que envuelve las funciones async para que cualquier error
// sea capturado automáticamente y pasado al middleware global sin try/catch manual
import { catchAsync }                     from '../utils/catchAsync.js';
// Importamos successResponse y errorResponse para que todas las respuestas
// tengan el mismo formato estándar: { success, message, data }
import { successResponse, errorResponse } from '../utils/response.util.js';
// loginService verifica credenciales y genera los tokens de sesión
// registerService crea el usuario nuevo con la contraseña ya hasheada
import { loginService, registerService }  from '../services/auth.service.js';

// Importamos las 4 funciones del módulo de recuperación que maneja el Map en memoria
import { guardarCodigo, verificarCodigo, codigoEsVerificado, eliminarCodigo } from '../utils/resetCodes.js';
// enviarCodigoRecuperacion envía el código de 6 dígitos al correo del usuario vía Mailtrap
import { enviarCodigoRecuperacion } from '../services/email.service.js';
// getUserByEmail nos permite buscar un usuario en la BD por su correo electrónico
import { getUserByEmail }           from '../models/user.model.js';
// updateUserPassword actualiza el campo password en la BD con el nuevo hash de bcrypt
import { updateUserPassword }       from '../models/user.model.js';
// hashearPassword convierte la contraseña en texto plano a un hash seguro con bcrypt
import { hashearPassword }          from '../services/auth.service.js';

// ── POST /api/auth/login ──────────────────────────────────────────────────────
// Recibe el email y la contraseña del formulario de inicio de sesión,
// verifica las credenciales y retorna los tokens de sesión al cliente
export const login = catchAsync(async (req, res) => {
    // Sacamos el email y la contraseña del cuerpo de la petición que llegó del formulario
    const { email, password } = req.body;

    // Llamamos a loginService que busca el usuario en la BD por su email,
    // compara la contraseña con el hash guardado usando bcrypt,
    // y si todo es correcto genera el accessToken (1h) y el refreshToken (7d)
    // Si las credenciales son incorrectas, loginService retorna null
    const resultado = await loginService({ email, password });

    // Si loginService retornó null significa que el email no existe o la contraseña no coincide
    // Respondemos con 401 (No Autorizado) sin decir cuál de los dos falló — por seguridad
    if (!resultado) {
        return errorResponse(res, 'Credenciales incorrectas', 401);
    }

    // Llegamos aquí porque las credenciales son correctas — enviamos los tokens y datos del usuario
    return successResponse(res, 'Inicio de sesión exitoso', resultado);
});

// ── POST /api/auth/register ──────────────────────────────────────────────────
// Recibe los datos del formulario de registro y crea un usuario nuevo en el sistema
// Cuerpo esperado: { name, documento, email, password }
export const register = catchAsync(async (req, res) => {
    // Sacamos los 4 campos del cuerpo — ya fueron validados por validateSchema(registerSchema)
    const { name, documento, email, password } = req.body;

    // Llamamos a registerService que verifica si el email o el documento ya están registrados,
    // hashea la contraseña con bcrypt y crea el usuario en MySQL con role = 'user' por defecto
    // Si hay un conflicto, retorna { error, codigo } en lugar de { usuario }
    const resultado = await registerService({ name, documento, email, password });

    // Si el resultado tiene la propiedad error significa que el email o documento ya existen
    if (resultado.error) {
        // resultado.codigo contiene el código HTTP apropiado — generalmente 409 (Conflicto)
        return errorResponse(res, resultado.error, resultado.codigo);
    }

    // Llegamos aquí porque el registro fue exitoso — respondemos con 201 Created y el usuario sin password
    return successResponse(res, 'Usuario registrado correctamente', resultado.usuario, 201);
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
// Paso 1 del flujo de 3 pasos para recuperar contraseña:
// el usuario escribe su correo y si existe en el sistema le enviamos un código de 6 dígitos
export const forgotPassword = catchAsync(async (req, res) => {
    // Sacamos el email del cuerpo de la petición que llegó del formulario de recuperación
    const { email } = req.body;

    // Validamos que el email llegó, que sea texto y que tenga el símbolo @ de un correo válido
    if (!email || typeof email !== 'string' || !email.includes('@')) {
        // El campo está vacío, no es texto o no tiene el formato de un correo → respondemos 400
        return errorResponse(res, 'El correo electrónico es inválido', 400);
    }

    // Buscamos el usuario en la BD normalizando el email (sin espacios, en minúsculas)
    const usuario = await getUserByEmail(email.trim().toLowerCase());

    // Si el usuario no existe, respondemos igual que si existiera para no revelar qué emails hay
    // (seguridad: evitar que alguien descubra qué correos están registrados en el sistema)
    if (!usuario) {
        return successResponse(res, 'Si el correo está registrado, recibirás el código en tu bandeja de entrada.', null);
    }

    // Generamos el código de 6 dígitos y lo guardamos en el Map en memoria con TTL de 15 minutos
    const codigo = guardarCodigo(email.trim().toLowerCase());

    // Enviamos el código al correo del usuario a través del servicio de Mailtrap
    // La función retorna true si el envío fue exitoso, false si hubo un error
    const correoEnviado = await enviarCodigoRecuperacion(email.trim().toLowerCase(), codigo);

    // Si el envío del correo falló, respondemos con 500 para que el usuario lo intente de nuevo
    if (!correoEnviado) {
        return errorResponse(res, 'Error al enviar el correo de recuperación. Intenta de nuevo.', 500);
    }

    // Enviamos el mismo mensaje genérico que cuando el email no existe — anti-enumeración
    return successResponse(res, 'Si el correo está registrado, recibirás el código en tu bandeja de entrada.', null);
});

// ── POST /api/auth/verify-reset-code ─────────────────────────────────────────
// Paso 2: el usuario escribe el código de 6 dígitos que recibió en su correo
// Verificamos que el código sea correcto y que no haya vencido (TTL de 15 minutos)
export const verifyResetCode = catchAsync(async (req, res) => {
    // Sacamos el email y el código del cuerpo de la petición del paso 2
    const { email, code } = req.body;

    // Verificamos que llegaron los dos campos necesarios antes de consultar el Map
    if (!email || !code) {
        return errorResponse(res, 'El correo y el código son obligatorios', 400);
    }

    // Llamamos a verificarCodigo que busca el email en el Map y compara el código ingresado
    // String(code).trim() convierte el número a texto y elimina espacios accidentales
    // Retorna { valido: boolean, razon: string } con el resultado de la verificación
    const resultado = verificarCodigo(email.trim().toLowerCase(), String(code).trim());

    // Si el código no es válido, resultado.razon tiene el motivo específico del error
    if (!resultado.valido) {
        // razon puede ser: "Código expirado", "Código incorrecto", "Código no encontrado"
        return errorResponse(res, resultado.razon, 400);
    }

    // Llegamos aquí porque el código es correcto — el frontend puede mostrar el paso 3
    return successResponse(res, 'Código verificado correctamente. Puedes cambiar tu contraseña.', null);
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────
// Paso 3: el usuario escribe la nueva contraseña
// Solo se permite si el email tiene un código que fue verificado exitosamente en el paso 2
export const resetPassword = catchAsync(async (req, res) => {
    // Sacamos el email y la nueva contraseña del cuerpo de la petición del paso 3
    const { email, newPassword } = req.body;

    // Verificamos que llegaron los dos campos necesarios antes de continuar
    if (!email || !newPassword) {
        return errorResponse(res, 'El correo y la nueva contraseña son obligatorios', 400);
    }

    // Normalizamos el email para que coincida exactamente con la clave guardada en el Map
    // (usamos el mismo formato que en los pasos 1 y 2: minúsculas, sin espacios)
    const emailNormalizado = email.trim().toLowerCase();

    // Verificamos que el código del paso 2 fue marcado como "verificado" en el Map
    // Si el usuario saltó el paso 2 o el código no fue verificado, rechazamos la petición
    if (!codigoEsVerificado(emailNormalizado)) {
        return errorResponse(res, 'El código no fue verificado. Por favor verifica el código primero.', 400);
    }

    // Verificamos que la nueva contraseña tenga al menos 6 caracteres — igual que en loginSchema
    if (newPassword.length < 6) {
        return errorResponse(res, 'La nueva contraseña debe tener al menos 6 caracteres', 400);
    }

    // Buscamos el usuario en la BD para obtener su id (lo necesitamos para updateUserPassword)
    const usuario = await getUserByEmail(emailNormalizado);
    // Si el email ya no está en la BD (caso extremamente raro), rechazamos la petición
    if (!usuario) {
        return errorResponse(res, 'El correo no está registrado en el sistema', 400);
    }

    // Hasheamos la nueva contraseña con bcrypt antes de guardarla — NUNCA texto plano en la BD
    const passwordHasheada = await hashearPassword(newPassword);

    // Guardamos el nuevo hash en la columna password del usuario en la BD
    await updateUserPassword(usuario.id, passwordHasheada);

    // Eliminamos el código del Map — ya fue usado y no debe poder reutilizarse
    eliminarCodigo(emailNormalizado);

    // Llegamos aquí porque la contraseña fue cambiada exitosamente — el usuario puede iniciar sesión
    return successResponse(res, 'Contraseña restablecida correctamente. Puedes iniciar sesión.', null);
});
