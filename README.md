# Rutigym

Aplicación móvil desarrollada con **Angular 20** y empaquetada como app nativa mediante **Capacitor 8**, orientada a la gestión de rutinas de gimnasio.

## Stack tecnológico

| Capa | Tecnología | Versión |
| --- | --- | --- |
| Framework frontend | Angular | ^20.3.0 |
| Runtime móvil / nativo | Capacitor (Core, CLI, Android, iOS) | ^8.6.0 |
| Base de datos local | @capacitor-community/sqlite | ^8.1.1 |
| Estado reactivo | RxJS | ~7.8.0 |
| Lenguaje | TypeScript | ~5.9.2 |
| Estilos | SCSS | — |
| Tests unitarios | Jasmine + Karma | ~5.9.0 / ~6.4.0 |

## Aplicación Capacitor

- **appId**: `com.example.app` (pendiente de personalizar)
- **appName**: `rutigym`
- **webDir**: `dist/rutigym/browser`
- Plataformas nativas incluidas: `android/` (proyecto Gradle ya generado)

## Estructura del proyecto

```
rutigym/
├── android/               # Proyecto nativo Android (Gradle)
├── public/                # Recursos estáticos (favicon.ico)
├── src/                   # Código fuente de la aplicación
│   ├── app/
│   │   ├── app.ts         # Componente raíz (App)
│   │   ├── app.html       # Plantilla del componente raíz
│   │   ├── app.scss       # Estilos del componente raíz
│   │   ├── app.config.ts  # Configuración de la aplicación
│   │   ├── app.routes.ts  # Definición de rutas (vacío por ahora)
│   │   └── app.spec.ts    # Tests unitarios del componente raíz
│   ├── index.html         # HTML de entrada
│   ├── main.ts            # Bootstrap de la aplicación
│   └── styles.scss        # Estilos globales
├── angular.json           # Configuración de Angular + Capacitor
├── capacitor.config.ts    # Configuración de Capacitor
├── package.json           # Dependencias y scripts
└── tsconfig.*.json        # Configuración de TypeScript
```

## Estado actual del proyecto

- Componente raíz `App` con un `signal` llamado `title` (valor `'rutigym'`).
- Plantilla `app.html` con contenido placeholder generado por Angular CLI (aún no reemplazado).
- `app.routes.ts` sin rutas definidas.
- `app.config.ts` con proveedores estándar: listeners globales de errores, detección de cambios por zona y router.
- Enrutamiento configurado con `standalone` APIs (sin módulos NgModule).
- Base de datos SQLite de Capacitor declarada como dependencia, aunque aún sin integración en el código fuente.

## Requisitos

- Node.js 20+ (el entorno de arranque usa Node v24.18.0)
- Angular CLI 20.3.27
- Android Studio / SDK para la plataforma Android (si se compila la app nativa)

## Instalación

```bash
npm install
```

## Desarrollo

Para levantar el servidor de desarrollo:

```bash
npm start
```

o directamente:

```bash
ng serve
```

La aplicación se sirve en `http://localhost:4200/` y se recarga automáticamente al modificar los archivos fuente.

## Compilación

Para compilar el proyecto (build de producción por defecto):

```bash
npm run build
```

Los artefactos se generan en el directorio `dist/`.

### Compilación en modo desarrollo (watch)

```bash
npm run watch
```

## Tests

Para ejecutar los tests unitarios con Karma:

```bash
npm test
```

## Sincronización con Capacitor

Para sincronizar el build web con el proyecto nativo:

```bash
npx cap sync
```

## Enlaces útiles

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Capacitor Documentation](https://capacitorjs.com/docs)
- [@capacitor-community/sqlite](https://github.com/capacitor-community/sqlite)
