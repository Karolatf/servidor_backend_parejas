# Guía del Sistema: Gestión Visual con Tablero Kanban (GitHub Projects)

El **Tablero Kanban** es nuestro "radiador de información": un panel
visual que le dice a todo el equipo exactamente cómo va el proyecto
en tiempo real.

---

## ¿Qué es un Tablero Kanban?

Cada *Issue* (tarea) es un Post-it. A medida que avanzas en tu trabajo,
vas moviendo tu Post-it de izquierda a derecha hasta llegar a la meta.

- **Cero estrés:** El tablero te dice qué debes hacer.
- **Transparencia:** El Líder sabe en qué está trabajando cada uno.
- **Detección de atascos:** Si una tarea lleva días en la misma columna,
  el equipo sabe que debe entrar a ayudar.

---

## Nuestras Columnas (El Camino del Código)

| Columna | ¿Qué significa? |
|---|---|
| **To Do** | Tareas aprobadas por el Líder, listas para iniciar |
| **In Progress** | Estás programando en tu rama `feat/`. Solo una tarea a la vez |
| **In Review** | Abriste tu PR y esperas aprobación del Líder |
| **Done** | El Líder aprobó el PR y el código está en `release` |

> **Regla de Oro:** Solo un Post-it en *In Progress* a la vez. Termina
> una tarea antes de empezar otra.

---

## Cómo configurar el Tablero (Solo para el Líder)

1. Ve a la pestaña **Projects** en tu repositorio.
2. Clic en **New project** → plantilla **Board** → *Create*.
3. Nombre: `Tablero Backend - servidor_backend_parejas`.
4. Ajusta las columnas: agrega **In Review** entre *In Progress* y *Done*.
5. En los tres puntos (`...`) del tablero ve a **Workflows** y activa:
   - *Auto-add to project*
   - *Item closed*

---

## La Rutina Diaria (Daily Stand-up)

Cada día, abran el tablero y respondan tres preguntas:

1. **¿Qué tarjeta moví ayer?** (Qué logré)
2. **¿Qué tarjeta voy a mover hoy?** (En qué me voy a enfocar)
3. **¿Hay algo bloqueando mi tarjeta?** (Necesito ayuda)
