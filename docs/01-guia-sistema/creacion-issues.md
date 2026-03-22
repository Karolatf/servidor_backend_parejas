# Guía del Sistema: Gestión de Issues en GitHub

Para construir software de calidad, no basta con escribir código; debemos
saber gestionar el trabajo. En GitHub, la herramienta principal para esto
son las **Issues** (tareas o requerimientos).

---

## ¿Qué es una Issue y para qué sirve?

Una **Issue** es una unidad de trabajo. Imagínala como un "ticket" o una
ficha técnica donde describimos un problema a resolver o una
funcionalidad a crear.

- **Trazabilidad:** Sabemos quién hizo qué, cuándo y por qué.
- **Organización:** El equipo no se pisa los pies.
- **Historial:** Permite revisar decisiones en caso de fallos futuros.

---

## ¿Quién crea las Issues?

- **El Líder:** Crea las tareas principales que vienen de la guía de
  aprendizaje. Es quien traza la ruta maestra del proyecto.
- **El Desarrollador:** Crea tareas cuando encuentra un error (`[BUG]`)
  o propone una mejora (`[FEAT]`).
- **Regla de Oro:** Cualquiera puede proponer una Issue, pero **solo el
  Líder decide** si se mueve a "To Do" en el Kanban.

---

## Cómo abrir una Issue

1. Ve a la pestaña **Issues** de tu repositorio.
2. Haz clic en **New Issue**.
3. Selecciona la plantilla correspondiente.
4. Llena **todos** los campos:
   - Asigna las **Labels** (enhancement, bug, documentation, chore).
   - Define el **Milestone**.
   - Asígnate tú mismo o a un compañero (**Assignees**).

---

## Criterios de calidad para una Issue

- **Título descriptivo:** Debe iniciar con el tipo de tarea.
  *(Ej: `[FEAT]: Crear userModel con operaciones CRUD`)*
- **Descripción clara:** Explica qué se va a desarrollar.
- **Vinculación:** Debe estar asociada a un **Milestone**.

---

## Cómo cerrar una Issue

- **Automática (recomendada):** En el Pull Request escribe `Closes #5`.
  Al aprobarse el PR, GitHub cierra la Issue automáticamente.
- **Manual:** Entrando a la Issue y haciendo clic en **Close issue**,
  solo cuando la tarea esté 100% terminada.

---

## Regla de Oro

> *No debe haber tareas sin asignar. Si una Issue no tiene responsable,
> nadie la va a terminar.*
