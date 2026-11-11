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
| `/configurar` | Configuración | Días de entrenamiento (`LUNES, MIÉRCOLES y VIERNES`) con **Borrar** si hay plan o **Empezar** si no lo hay |
| `/configurar/dias` | Días | Pregunta cuántos días entrenar y permite marcar `L M X J V S D` en selección múltiple |
| `/configurar/ejercicios` | Ejercicios | Listado agrupado en **CORE**, **PIERNAS** y **BRAZOS** con el número de series por ejercicio |
| `/entrenar` | Entrenar | Listado de días del plan, con el día actual preseleccionado, y botón **Empezar** |
| `/entrenar/:day` | Rutina del día | Ejercicios del día agrupados por bloque, con progreso de series registradas |
| `/entrenar/:day/:exerciseId` | Registro | Repeticiones y kilos por serie, con marca de serie completada |

### Flujo

```
Inicio ─┬─ Configurar ─┬─ (sin plan)  Empezar ─ Días ─ Ejercicios ─ Guardar rutina
        │               └─ (con plan)  Borrar / Editar ejercicios
        └─ Entrenar ─ Día ─ Ejercicio ─ Registrar series ─ Guardar
```

### Persistencia

El MVP no usa backend. El plan semanal y el registro de series se guardan en `localStorage`:

- `rutigym.plan.v1` → días de la semana y series por ejercicio.
- `rutigym.logs.v1` → repeticiones y kilos registrados por día y ejercicio.

La integración de `@capacitor-community/sqlite` queda para una siguiente iteración; el acceso al almacenamiento está aislado en `RoutineStore` para poder sustituirlo sin tocar las pantallas.

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
│   │   │   ├── config/config-exercises.page.*
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

La lógica cubierta es la del estado (`RoutineStore`): formato de días, persistencia, series por
ejercicio, alta y borrado del plan y progreso por ejercicio y por día.

## Sincronización con Capacitor

```bash
npx cap sync
```

## Enlaces útiles

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Angular signals](https://angular.dev/guide/signals)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite)
