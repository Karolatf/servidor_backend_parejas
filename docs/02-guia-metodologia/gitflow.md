# Guía de Metodología: GitFlow Profesional (El Ciclo de Vida del Código)

En nuestra Software Factory, programar bien es solo la mitad del trabajo;
la otra mitad es saber **cómo y dónde** integrar ese código sin romper
el proyecto de los demás. Para eso usamos **GitFlow**.

---

## 1. El Árbol del Proyecto (Nuestras Ramas Oficiales)

1. **`main` (Producción):** Es código sagrado. Aquí solo existe software
   100% funcional, probado y listo. **Nadie programa directamente aquí.**
2. **`release` (Integración):** Es el corazón del proyecto. Aquí se unen
   todas las tareas individuales del equipo.
3. **`feat/...` (Tareas):** Son ramas temporales. Cada vez que tomas una
   Issue del Kanban, creas una de estas ramas para trabajar aislado.

---

## 2. El Flujo Diario del Desarrollador

### Paso 1: Clonar el repo (Solo el Día 1)

```bash
git clone https://github.com/Karolatf/servidor_backend_parejas.git
cd servidor_backend_parejas
git checkout release
```

### Paso 2: Sincronización diaria (Todos los días)

```bash
git checkout release
git pull origin release
```

### Paso 3: Crear tu rama de tarea

Si tomaste la Issue #6 para crear el userModel:

```bash
git checkout -b feat/user-model
```

### Paso 4: Programar y guardar (Conventional Commits)

```bash
git add .
git commit -m "feat(model): crear userModel con operaciones CRUD (#6)"
```

### Paso 5: Sincronización final antes de subir

```bash
git checkout release
git pull origin release
git checkout feat/user-model
git merge release
# Si hay conflictos, resuélvelos aquí en tu máquina
git push origin feat/user-model
```

### Paso 6: Abrir el Pull Request

Ve a GitHub y abre un PR de tu rama `feat/user-model` hacia `release`.
Pide la revisión del Líder y mueve tu tarjeta en el Kanban a *In Review*.

---

## 3. El Flujo del Líder (Cierre de Milestone)

### Paso 1: Crear la rama release/vX.X.X

```bash
git checkout release
git pull origin release
git checkout -b release/v1.0.0
```

### Paso 2: Pruebas y ajustes menores

Solo correcciones pequeñas y actualización de versión en `package.json`.
No se agregan funcionalidades nuevas aquí.

### Paso 3: Merge a main y tag de versión

```bash
# Abrir PR de release/v1.0.0 → main en GitHub
# Una vez aprobado:
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release M1: Configuracion y estructura"
git push origin v1.0.0
```

### Paso 4: Devolver ajustes a release

```bash
git checkout release
git merge origin/release/v1.0.0
git push origin release
```

---

## Regla de Oro

> *¡Cero código a `main` sin pasar por `release`!*
