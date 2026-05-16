# Mailtrap y Recuperación de Contraseña

**Guía de exposición**  
**Fecha:** Mayo 2026

---

## ¿Qué es Mailtrap?

**Mailtrap** es un servicio de correo electrónico para entornos de desarrollo y pruebas. En lugar de enviar correos reales a la bandeja de entrada del usuario, los captura en una **bandeja de entrada falsa** que solo puede ver el equipo de desarrollo.

> **Analogía sencilla para la expo:** Imagina que Mailtrap es un cartero de práctica. Tú le das la carta (el correo), él hace todo el proceso de entrega, pero en vez de llegar al destinatario real, la carta llega a una oficina de ensayo donde tú puedes revisar que el contenido y el formato estén bien. En producción real ese mismo cartero entregaría cartas de verdad.

**¿Por qué se usa en este proyecto?**  
Durante el desarrollo, no se pueden enviar correos reales a usuarios porque podría afectar cuentas externas con mensajes de prueba. Mailtrap permite probar el flujo completo de recuperación de contraseña sin consecuencias.

---

## ¿Dónde vive Mailtrap en el proyecto?

El proyecto está dividido en dos repositorios: **frontend** y **backend**.

| Parte | Responsabilidad |
|---|---|
| **Frontend** (repo separado) | Muestra el modal de 3 pasos, valida el formulario, llama a la API |
| **Backend** (este repo) | Genera el código, envía el correo por Mailtrap, valida el código, cambia la contraseña |

**Mailtrap está configurado únicamente en el backend.** El frontend no conoce Mailtrap, solo sabe que llama a un endpoint y espera una respuesta.

---

## Flujo completo — Recuperar contraseña

El proceso tiene **3 pasos** encadenados. Cada paso es una pantalla dentro del mismo modal.

```
Usuario                 Frontend               Backend              Mailtrap
   │                       │                      │                     │
   │  Click "¿Olvidó       │                      │                     │
   │  su contraseña?"      │                      │                     │
   │──────────────────────>│                      │                     │
   │                       │  Abre modal Paso 1   │                     │
   │<──────────────────────│                      │                     │
   │                       │                      │                     │
   │  Escribe su email     │                      │                     │
   │──────────────────────>│                      │                     │
   │                       │  POST /forgot-password│                    │
   │                       │─────────────────────>│                     │
   │                       │                      │  Genera código 6    │
   │                       │                      │  dígitos y envía    │
   │                       │                      │  correo ────────────>
   │                       │                      │                     │
   │                       │        200 OK        │                     │
   │                       │<─────────────────────│                     │
   │                       │  Muestra Paso 2      │                     │
   │<──────────────────────│                      │                     │
   │                       │                      │                     │
   │  Abre Mailtrap,       │                      │                     │
   │  copia el código      │                      │                     │
   │  Escribe el código    │                      │                     │
   │──────────────────────>│                      │                     │
   │                       │  POST /verify-reset-code                   │
   │                       │─────────────────────>│                     │
   │                       │        200 OK        │                     │
   │                       │<─────────────────────│                     │
   │                       │  Muestra Paso 3      │                     │
   │<──────────────────────│                      │                     │
   │                       │                      │                     │
   │  Escribe nueva        │                      │                     │
   │  contraseña           │                      │                     │
   │──────────────────────>│                      │                     │
   │                       │  POST /reset-password│                     │
   │                       │─────────────────────>│                     │
   │                       │        200 OK        │                     │
   │                       │<─────────────────────│                     │
   │                       │  Cierra modal, éxito │                     │
   │<──────────────────────│                      │                     │
```

---

## Paso 1 — El usuario ingresa su email

**¿Qué ve el usuario?**  
Un campo de texto para escribir su correo electrónico registrado.

**¿Qué hace el frontend?**  
1. Valida que el email tenga formato correcto (`usuario@dominio.com`)
2. Llama al backend con una petición HTTP:

```
POST http://localhost:3000/api/auth/forgot-password
Body: { "email": "usuario@correo.com" }
```

**¿Qué hace el backend?**  
1. Verifica que el email exista en la base de datos
2. Genera un código aleatorio de 6 dígitos (ej: `482931`)
3. Guarda ese código en la BD asociado al email, con una **fecha de expiración** (usualmente 15 minutos)
4. Envía un correo usando Nodemailer + Mailtrap con el código

**¿Qué llega a Mailtrap?**  
Un correo con asunto tipo "Recuperación de contraseña" y el código de 6 dígitos en el cuerpo.

**Respuesta al frontend:**
- `200 OK` → avanza al Paso 2
- `404` → el email no está registrado

---

## Paso 2 — El usuario ingresa el código

**¿Qué ve el usuario?**  
Un campo para ingresar el código de 6 dígitos que llegó a su correo (en Mailtrap durante las pruebas).

**¿Qué hace el frontend?**  
1. Valida que sean exactamente 6 dígitos numéricos
2. Llama al backend:

```
POST http://localhost:3000/api/auth/verify-reset-code
Body: { "email": "usuario@correo.com", "code": "482931" }
```

**¿Qué hace el backend?**  
1. Busca en la BD el código guardado para ese email
2. Verifica que el código ingresado coincida
3. Verifica que el código **no haya expirado**
4. Si todo es válido, responde con éxito

**Respuesta al frontend:**
- `200 OK` → avanza al Paso 3
- `400` → código incorrecto o expirado

---

## Paso 3 — El usuario escribe su nueva contraseña

**¿Qué ve el usuario?**  
Un campo para ingresar la nueva contraseña.

**¿Qué hace el frontend?**  
1. Valida que la contraseña tenga mínimo 6 caracteres
2. Llama al backend:

```
POST http://localhost:3000/api/auth/reset-password
Body: { "email": "usuario@correo.com", "newPassword": "nuevaContra123" }
```

**¿Qué hace el backend?**  
1. Hashea la nueva contraseña (con bcrypt u otra librería)
2. Actualiza la contraseña del usuario en la BD
3. Elimina el código de recuperación (para que no pueda usarse de nuevo)

**Respuesta al frontend:**
- `200 OK` → muestra notificación de éxito, cierra el modal
- `400` → error al restablecer

---

## Configuración de Mailtrap en el backend

**Variables de entorno** (archivo `.env`):

```env
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=<usuario de la cuenta Mailtrap>
MAILTRAP_PASS=<contraseña de la cuenta Mailtrap>
```

**Cómo se crea el transporte de correo** (Nodemailer):

```js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host:  process.env.MAILTRAP_HOST,
    port:  process.env.MAILTRAP_PORT,
    auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
    }
});
```

**Cómo se envía el correo con el código:**

```js
await transporter.sendMail({
    from:    '"Transferencia DOM" <no-reply@transferencia.com>',
    to:      email,
    subject: 'Código de recuperación de contraseña',
    html:    `<p>Tu código de recuperación es: <strong>${codigo}</strong></p>
              <p>Este código expira en 15 minutos.</p>`,
});
```

---

## Cómo ver el correo en Mailtrap (durante las pruebas)

1. Ir a [mailtrap.io](https://mailtrap.io) e iniciar sesión
2. En el panel izquierdo: **Email Testing** → **Inboxes**
3. Abrir la bandeja del proyecto
4. El correo con el código aparece ahí — clicar para verlo

> En producción real, este mismo correo llegaría al Gmail u otro servicio del usuario. Para eso se cambia la configuración del backend a un proveedor real como **SendGrid** o **Resend**, sin tocar nada del frontend.

---

## Resumen de archivos del backend

| Archivo | Qué hace |
|---|---|
| `src/routes/auth.routes.js` | Define los 3 endpoints de recuperación |
| `src/controllers/auth.controller.js` | Lógica de cada endpoint |
| `src/services/auth.service.js` | Generación de código, envío de email, validación |
| `src/config/mailer.js` (o similar) | Configuración de Nodemailer + Mailtrap |
| `.env` | Credenciales de Mailtrap |

---

## Preguntas frecuentes de expo

**¿Por qué el correo llega a Mailtrap y no al Gmail del usuario?**  
Porque el backend está en modo desarrollo. La configuración SMTP apunta al servidor de pruebas de Mailtrap. En producción, ese servidor se cambia por uno real y los correos llegan directamente.

**¿Es seguro el sistema?**  
Sí. El código expira en 15 minutos y solo sirve una vez. La contraseña se guarda hasheada, no en texto plano. El código en sí tampoco se guarda en texto plano en algunos sistemas (hash del código).

**¿Qué pasa si el usuario pone un email que no existe?**  
El backend responde con error y el frontend muestra un mensaje: "No existe una cuenta con ese correo".

**¿Se puede usar en celular?**  
Sí. El modal de recuperación es completamente responsive. En móvil funciona igual que en escritorio.
