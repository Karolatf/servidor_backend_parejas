// MÓDULO: services/email.service.js
// CAPA: Servicios
//
// Responsabilidad única: configurar y enviar correos con Mailtrap vía SMTP.
// Usa nodemailer como cliente SMTP.
//
// Por qué nodemailer + Mailtrap:
//   Mailtrap es un servicio de "email testing" que intercepta los correos
//   y los muestra en su panel web en lugar de enviarlos a casillas reales.
//   Es ideal para proyectos de desarrollo como este donde no queremos
//   enviar correos reales durante las pruebas del sistema.
//
// Las credenciales vienen del archivo .env para que no queden
// expuestas en el código fuente ni sean visibles en GitHub.

// Importamos nodemailer que es la librería de Node.js para enviar correos vía SMTP
import nodemailer from 'nodemailer';

// Creamos el transporter de nodemailer que es el objeto que sabe conectarse al servidor SMTP de Mailtrap
// process.env lee las variables del archivo .env que dotenv cargó al iniciar la aplicación
// El operador || provee un valor de respaldo si la variable no está definida en el .env
const transporter = nodemailer.createTransport({
    // host: el servidor SMTP de Mailtrap — sandbox intercepta los correos sin enviarlos a nadie real
    host:   process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    // port: el puerto SMTP que usa Mailtrap — puede ser 2525, 465 o 587 según la configuración
    port:   Number(process.env.MAILTRAP_PORT) || 2525,
    auth: {
        // user y pass: las credenciales de acceso al inbox de Mailtrap — vienen del .env
        user: process.env.MAILTRAP_USER || '',
        pass: process.env.MAILTRAP_PASS || '',
    },
});

// ── enviarCodigoRecuperacion ──────────────────────────────────────────────────
// Exportamos la función enviarCodigoRecuperacion que recibe el correo del usuario
// y el código de 6 dígitos generado en resetCodes.js, y envía el email de recuperación
// Retorna true si el correo se envió correctamente, false si hubo algún error
export async function enviarCodigoRecuperacion(destinatario, codigo) {
    try {
        // Construimos el objeto mailOptions con todos los campos del correo a enviar
        const mailOptions = {
            // from: el nombre y dirección del remitente que verá el destinatario en su correo
            from:    `"Task App SENA" <${process.env.MAILTRAP_FROM || 'noreply@taskapp.sena.edu.co'}>`,
            // to: la dirección de correo del usuario que solicitó la recuperación
            to:      destinatario,
            // subject: el asunto del correo que aparece en la bandeja de entrada
            subject: 'Código de recuperación de contraseña — Task App',
            // text: versión en texto plano para clientes de correo que no soportan HTML
            text: `Tu código de recuperación es: ${codigo}\n\nEste código vence en 15 minutos.\nSi no solicitaste este correo, ignóralo.`,
            // html: versión con estilos visuales para que el correo se vea bien en Mailtrap
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

        // Llamamos a transporter.sendMail que envía el correo al servidor SMTP de Mailtrap
        // En el panel de Mailtrap el correo aparece en el inbox para revisarlo visualmente
        await transporter.sendMail(mailOptions);
        // Retornamos true para indicar al controlador que el envío fue exitoso
        return true;

    } catch (error) {
        // Si el envío falla (credenciales incorrectas, Mailtrap caído, problema de red, etc.)
        // registramos el error en consola para debuggear sin romper el servidor
        console.error('enviarCodigoRecuperacion: error al enviar correo:', error.message);
        // Retornamos false para que el controlador responda 500 al cliente
        return false;
    }
}
