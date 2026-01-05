import {ApplicationConfig, provideBrowserGlobalErrorListeners} from '@angular/core';
import {provideRouter} from '@angular/router';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';

import {routes} from './app.routes';
import {authInterceptor} from './auth/auth.interceptor';
import {SKILL_REPOSITORY_TOKEN} from './services/skills/domain/skill.interface';
import {SkillsHttp} from './services/skills/data/skills-http';
import {providePrimeNG} from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import {definePreset, palette} from '@primeuix/themes';

const IteraTheme = definePreset(Aura, {
  semantic: {
    primary: palette('{violet}'),
    colorScheme: {
      light: {
        surface: palette('{slate}'),
      },
      dark: {
        surface: palette('{slate}'),
      },
    },
  },
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideRouter(routes),
    {
      provide: SKILL_REPOSITORY_TOKEN,
      useClass: SkillsHttp,
    },
    providePrimeNG({
      theme: {
        preset: IteraTheme,
        options: {
          // Force dark mode via a class we keep always present on <html>.
          darkModeSelector: '.itera-dark',
        },
      },
    }),
  ],
};
