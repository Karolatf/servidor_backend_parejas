---
name: "Reporte de Error (Bug)"
about: Utiliza esta plantilla para informar un fallo técnico en el backend.
title: "bug: [Escribe un resumen corto del error]"
labels: bug
assignees: ''
---

## Descripción del Error
**Ejemplo:** *El servidor responde con status 500 al intentar crear una
tarea sin el campo `title`, en lugar de responder con un 400 controlado.*

## Pasos para Reproducir
**Ejemplo:**
1. Ejecutar el servidor con `npm run dev`.
2. Abrir Postman y hacer `POST /api/tasks` con el body `{}` (sin title).
3. Observar que el servidor responde 500 en lugar de 400.

## Comportamiento Esperado vs. Actual
- **Lo que debería pasar:** *El controlador valida que `title` existe y
  responde `400 Bad Request` con un mensaje claro.*
- **Lo que pasa actualmente:** *El servidor lanza un error no controlado
  y responde `500 Internal Server Error`.*

## Entorno de Desarrollo
- **Sistema Operativo:** Windows 11 / Linux Ubuntu 22.04
- **Versión de Node.js:** v18.x.x o superior
- **Herramienta de prueba:** Postman / Thunder Client

## Evidencia (Opcional)
*Adjunta capturas de pantalla o el mensaje exacto de error en consola.*

---
> *Recuerda: Un bug bien reportado ahorra horas de frustración al equipo.*
