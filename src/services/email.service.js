// MÓDULO: services/email.service.js
// CAPA: Servicios

// Responsabilidad única: configurar y enviar correos con Mailtrap vía SMTP.
// Usa nodemailer como cliente SMTP.

// Por qué nodemailer + Mailtrap SMTP:
//   Mailtrap es un servicio de "email testing" que intercepta los correos
//   y los muestra en su panel en lugar de enviarlos a casillas reales.
//   Es ideal para proyectos de desarrollo como este, donde no se quiere
//   enviar correos reales durante las pruebas.

// Las credenciales vienen de variables de entorno (.env) para que no queden
// expuestas en el código fuente y no sean visibles en GitHub.
 
import nodemailer from 'nodemailer';
 
// Crear el transporter de nodemailer con la configuración SMTP de Mailtrap.
// process.env lee las variables del archivo .env (cargado por dotenv en app.js).
// Cada variable tiene un valor de fallback para evitar errores si .env no existe.
const transporter = nodemailer.createTransport({
    host:   process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    port:   Number(process.env.MAILTRAP_PORT) || 2525,
    auth: {
        user: process.env.MAILTRAP_USER || '',
        pass: process.env.MAILTRAP_PASS || '',
    },
});
 
// enviarCodigoRecuperacion — envía el correo con el código de 6 dígitos.

// Parámetro: destinatario — el email del usuario que solicita recuperación
// Parámetro: codigo — el código de 6 dígitos generado en resetCodes.js

// Retorna: true si el correo se envió correctamente, false si hubo un error.
// El caller (controlador) decide qué responder al cliente según el retorno.
export async function enviarCodigoRecuperacion(destinatario, codigo) {
    try {
        // mailOptions define el encabezado y el cuerpo del correo
        const mailOptions = {
            // from: dirección de origen visible para el destinatario
            from:    `"Task App SENA" <${process.env.MAILTRAP_FROM || 'noreply@taskapp.sena.edu.co'}>`,
            to:      destinatario,
            subject: 'Código de recuperación de contraseña — Task App',
            // text: versión en texto plano del correo (para clientes que no soportan HTML)
            text: `Tu código de recuperación es: ${codigo}\n\nEste código vence en 15 minutos.\nSi no solicitaste este correo, ignóralo.`,
            // html: versión enriquecida con estilo básico para mejor presentación en Mailtrap
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                    <h2 style="color: #059669; margin-top: 0;">Task App — Recuperación de Contraseña</h2>
                    <p style="color: #374151;">Recibimos una solicitud para restablecer tu contraseña.</p>
                    <p style="color: #374151;">Usa el siguiente código de verificación:</p>
                    <div style="background: #d1fae5; padding: 16px 24px; border-radius: 6px; text-align: center; margin: 24px 0;">
                        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #065f46;">${codigo}</span>
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">Este código vence en <strong>15 minutos</strong>.</p>
                    <p style="color: #6b7280; font-size: 14px;">Si no solicitaste este correo, puedes ignorarlo.</p>
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
                    <p style="color: #9ca3af; font-size: 12px;">SENA — Técnico en Programación de Software</p>
                </div>
            `,
        };
 
        // transporter.sendMail envía el correo y retorna información sobre el envío.
        // En Mailtrap el correo aparece en el inbox configurado.
        await transporter.sendMail(mailOptions);
        return true;
 
    } catch (error) {
        // Si el envío falla (credenciales incorrectas, Mailtrap caído, etc.)
        // se registra el error en consola sin romper el servidor
        console.error('enviarCodigoRecuperacion: error al enviar correo:', error.message);
        return false;
    }
}