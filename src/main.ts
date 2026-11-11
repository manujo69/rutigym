import { bootstrapApplication } from '@angular/platform-browser';
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader';

import { App } from './app/app';
import { appConfig } from './app/app.config';

// Registers the <jeep-sqlite> web component used by the SQLite plugin on the web platform.
defineJeepSqlite(window);

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
