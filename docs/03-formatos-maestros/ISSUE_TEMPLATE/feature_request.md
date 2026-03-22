---
name: "🛠️ Requerimiento Técnico"
about: Plantilla para la creación de nuevas funcionalidades o tareas del proyecto.
title: "[FEAT]: "
labels: enhancement
assignees: ''
---

## Descripción del Requerimiento
*Describe de forma clara qué funcionalidad se va a implementar y por
qué es necesaria para el backend.*

> **Ejemplo:** "Como desarrollador, quiero crear el taskModel para que
> el controlador pueda hacer operaciones CRUD sobre las tareas sin
> manejar los datos directamente."

---

## Criterios de Aceptación (Definition of Done)
*Estos son los puntos que el Líder verificará para aprobar tu PR:*

- [ ] La funcionalidad respeta la arquitectura MVC del proyecto.
- [ ] No existen errores en la consola del servidor al ejecutar `npm run dev`.
- [ ] El código respeta la separación de capas (model / controller / routes).
- [ ] Se probaron los endpoints afectados en Postman o Thunder Client.
- [ ] Se implementó manejo de errores con `try/catch`.

---

## Tareas Técnicas
*Divide el requerimiento en pasos pequeños:*

1. [ ] Identificar en qué capa(s) impacta el cambio (model / controller / routes).
2. [ ] Implementar la lógica en la capa correspondiente.
3. [ ] Realizar pruebas locales con el servidor corriendo en `localhost:3000`.
4. [ ] Verificar que no se rompió ningún endpoint existente.

---

## Evidencia y Recursos
*Adjunta capturas del JSON de respuesta en Postman o Thunder Client.*

---

**Recuerda:** Al terminar esta tarea, debes abrir un Pull Request hacia
`release` y vincularlo usando la frase `Closes #ID_DE_ESTA_ISSUE`.
