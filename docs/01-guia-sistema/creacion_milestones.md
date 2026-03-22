# Guía del Sistema: Gestión y Cronograma de Milestones (Hitos)

Si las **Issues** son los ladrillos de nuestra construcción, el
**Milestone (Hito)** es el plano que nos dice cuándo terminar una
habitación completa. Sin hitos, solo estamos haciendo tareas sueltas;
con hitos, estamos alcanzando metas reales.

---

## ¿Qué es un Milestone y para qué sirve?

Es un contenedor de tareas que tiene una fecha de entrega y un objetivo
específico. Sirve para agrupar todas las **Issues** necesarias para
completar una fase del proyecto.

- **Importancia:** Nos da un porcentaje real de progreso. No podemos
  decir *"ya casi acabamos"* si la barra del Milestone no está cerca
  del 100%.

---

## Cómo crear un Milestone en GitHub (Paso a Paso)

El Líder es el encargado de configurar la ruta del equipo:

1. Ve a la pestaña **Issues** de tu repositorio.
2. Haz clic en el botón **Milestones**.
3. Haz clic en el botón verde **New milestone**.
4. Llena los campos:
   - **Title:** Corto y profesional *(Ej: M1 - Configuración y Estructura)*
   - **Due Date:** Fecha límite de entrega.
   - **Description:** Define qué se habrá logrado al finalizar.

---

## Cronograma del Proyecto Backend

| Milestone | Objetivo | Tareas que incluye |
|---|---|---|
| M1: Configuración y Estructura | Repo listo con metodología | Docs, TEAM_AGREEMENT, blindaje, Kanban, Issues |
| M2: Modelos y Controladores | CRUD funcional en memoria | userModel, taskModel, usersController, tasksController |
| M3: Rutas y Servidor | API REST completa y probada | userRoutes, taskRoutes, app.js, pruebas con Postman |
| M4: Calidad y Documentación | Producto final listo | README final, limpieza de código, tag de versión |

---

## Regla de Oro

> *Tarea que no tiene Milestone es una tarea que no suma al progreso
> del equipo. Un Milestone se cierra únicamente cuando la barra de
> progreso llega al 100%.*
