# Guía del Sistema: Blindaje de Ramas (GitHub Rulesets)

En una Software Factory, el código es el activo más valioso. Un error
empujado directamente a `main` puede tumbar toda la aplicación. Para
evitar el caos, aplicaremos **Rulesets** (conjuntos de reglas) que
funcionan como candados de seguridad para nuestras ramas principales.

## ¿Qué ramas vamos a blindar?

1. **`release` (Entorno de integración):** Nadie empuja código directo
   aquí; todo entra por Pull Request.
2. **`main` (Entorno de producción):** Es sagrada. Solo recibe código
   desde `release` al finalizar un Hito (Milestone).

---

## Paso a Paso para la Configuración (Rol: Líder)

1. Entra a la pestaña **Settings** de tu repositorio.
2. En el menú lateral ve a `Rules` → `Rulesets` → botón verde
   `New ruleset` → `New branch ruleset`.
3. **Ruleset Name:** `Blindaje release y main`.
4. **Enforcement status:** `Active`.
5. **Bypass list:** clic en `Add bypass` → selecciona
   `Repository admin` → elige `Always allow`.
6. **Target branches:** clic en `Add target` → `Include by pattern`
   → escribe `release` → `Add inclusion pattern`.
   Repetir para agregar `main`.

---

## Reglas a Activar

| Regla | Obligatoria | Para qué sirve |
|---|---|---|
| Restrict deletions | ⭐ Sí | Impide borrar la rama por error |
| Require a pull request before merging | ⭐ Sí | Todo entra por PR |
| Required approvals | ⭐ Sí (1) | El Líder debe aprobar cada PR |

---

## Regla de Oro

> *Nadie hace push directo a `release` ni a `main`. Todo el código
> entra por Pull Request, sin excepciones.*
