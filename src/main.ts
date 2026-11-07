import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { resetOnNewRelease } from './app/core/version/release-reset';

resetOnNewRelease()
  .catch(() => true)
  .then((ready) => (ready ? bootstrapApplication(App, appConfig) : undefined))
  .catch((err) => console.error(err));
