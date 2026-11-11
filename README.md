# Rutigym

Aplicación móvil desarrollada con **Angular 20** y empaquetada como app nativa mediante **Capacitor 8**, orientada a la gestión de rutinas de gimnasio.

## Stack tecnológico

| Capa | Tecnología | Versión |
| --- | --- | --- |
| Framework frontend | Angular | ^20.3.0 |
| Runtime móvil / nativo | Capacitor (Core, CLI, Android, iOS) | ^8.6.0 |
| Base de datos local | @capacitor-community/sqlite | ^8.1.1 |
| Estado reactivo | Signals de Angular + RxJS | ~7.8.0 |
| Lenguaje | TypeScript | ~5.9.2 |
| Estilos | SCSS con design tokens | — |
| Tests unitarios | Jasmine + Karma | ~5.9.0 / ~6.4.0 |

## Pantallas del MVP

Tema visual azul (azul marino profundo → azul vivo, superficies azul claro). Todas las pantallas están pensadas para móvil y se limitan a un ancho máximo de 520 px.

| Ruta | Pantalla | Contenido |
| --- | --- | --- |
| `/` | Inicio | Marca, resumen del plan y dos botones grandes: **Entrenar** y **Configurar** |
| `/configurar` | Configuración | Días de entrenamiento (`LUNES, MIÉRCOLES y VIERNES`), **Borrar** y la lista de rutinas por día con su resumen |
| `/configurar/dias` | Días | Pregunta cuántos días entrenar y permite marcar `L M X J V S D` en selección múltiple |
| `/configurar/rutinas/:day` | Rutina del día | Chips `L M X J V S D` para cambiar de día; la rutina arranca vacía y se van sumando ejercicios con sus series |
| `/configurar/rutinas/:day/agregar` | Añadir ejercicios | Catálogo agrupado en **CORE**, **PIERNAS** y **BRAZOS** con selección múltiple; los ya añadidos aparecen deshabilitados |
| `/entrenar` | Entrenar | Días del plan con sus ejercicios y series, con el día actual preseleccionado y botón **Empezar** |
| `/entrenar/:day` | Rutina del día | Ejercicios del día agrupados por bloque, con progreso de series registradas y aviso cuando el día está vacío |
| `/entrenar/:day/:exerciseId` | Registro | Series con check, número, pastilla de kg y pastilla de reps; serie hecha en verde, `‹ ›` para cambiar reps (±1) y kg (±2,5), y `+ Añadir una serie` para series extra |

### Flujo

```
Inicio ─┬─ Configurar ─┬─ (sin plan)  Empezar ─ Días ─ Rutina del día ─ Añadir ejercicios ─ Listo
        │               └─ (con plan)  Borrar / Editar días / Editar cada día
        └─ Entrenar ─ Día ─ Ejercicio ─ Registrar series ─ Guardar
```

Cada día configurado tiene su propia rutina independiente: añadir o quitar ejercicios en un día no
afecta a los demás, y un día puede quedar sin ejercicios (la pantalla de entrenamiento lo avisa).

### Persistencia

El MVP no usa backend. El plan semanal y el registro de series se guardan en `localStorage`:

- `rutigym.plan.v2` → días configurados y la rutina de cada día (`routines[day]`, en orden de alta).
- `rutigym.logs.v2` → series registradas por día y ejercicio; la longitud puede superar las series
  configuradas cuando se añaden series extra en la sesión.
- `rutigym.last-values.v1` → últimos reps/kg usados por ejercicio, para precargar la próxima sesión.

Los valores de una serie no se escriben a mano: arrancan con `10` reps y `20` kg si el ejercicio nunca
se registró, o con los últimos valores usados de ese ejercicio, y se ajustan con los botones `‹ ›`.
La clave del plan es `v2` y la de logs es `v2`: un plan o un log del modelo anterior (`v1`) no se lee,
tal como corresponde a este MVP sin usuarios reales.

La integración de `@capacitor-community/sqlite` queda para una siguiente iteración; el acceso al
almacenamiento está aislado en `RoutineStore` para poder sustituirlo sin tocar las pantallas.

## Estructura del proyecto

```
rutigym/
├── android/                    # Proyecto nativo Android (Gradle)
├── public/                     # Recursos estáticos
├── src/
│   ├── app/
│   │   ├── core/
│   │   │   ├── models.ts            # Tipos, días de la semana y utilidades
│   │   │   ├── exercise-catalog.ts  # Catálogo de ejercicios por grupo
│   │   │   ├── routine-store.ts     # Estado del plan y del registro (signals)
│   │   │   └── routine-store.spec.ts
│   │   ├── features/
│   │   │   ├── home/home.page.*
│   │   │   ├── config/config.page.*
│   │   │   ├── config/config-days.page.*
│   │   │   ├── config/config-day.page.*
│   │   │   ├── config/config-add-exercises.page.*
│   │   │   ├── train/train.page.*
│   │   │   ├── train/train-day.page.*
│   │   │   └── train/exercise-log.page.*
│   │   ├── app.ts / app.html / app.scss
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── styles.scss             # Design tokens y estilos compartidos
│   ├── index.html
│   └── main.ts
├── angular.json
├── capacitor.config.ts
└── package.json
```

## Requisitos

- Node.js 20+, 22+ o 24+ (el entorno de arranque usa Node v22.23.3)
- Angular CLI 20.3.27
- Android Studio / SDK para la plataforma Android (si se compila la app nativa)

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm start
```

o directamente:

```bash
ng serve
```

La aplicación se sirve en `http://localhost:4200/` y se recarga automáticamente al modificar los archivos fuente.

## Compilación

```bash
npm run build
```

Los artefactos se generan en `dist/rutigym`.

## Tests

Los tests se ejecutan con Karma y Chrome en modo headless:

```bash
CHROME_BIN=/usr/bin/google-chrome npm test -- --watch=false --browsers=ChromeHeadless
```

La lógica cubierta es la del estado (`RoutineStore`): formato de días, rutinas independientes por día,
alta explícita de ejercicios, series por ejercicio, persistencia, borrado de un día o del plan completo
y progreso por ejercicio y por día.

## Sincronización con Capacitor

```bash
npx cap sync
```

## Enlaces útiles

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Angular signals](https://angular.dev/guide/signals)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite)
