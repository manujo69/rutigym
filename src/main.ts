import { bootstrapApplication } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// The <jeep-sqlite> web component only backs the SQLite plugin on the web (sql.js). On a native
// platform the plugin talks to real SQLite, so registering the component there is dead weight.
if (Capacitor.getPlatform() === 'web') {
  void import('jeep-sqlite/loader').then(({ defineCustomElements }) => defineCustomElements(window));
}

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
