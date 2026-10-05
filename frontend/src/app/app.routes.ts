import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full',
  },

  {
    path: 'splash',
    loadComponent: () => import('./pages/splash/splash').then((m) => m.Splash),
  },

  {
    path: 'onboarding',
    children: [
      {
        path: 'welcome',
        loadComponent: () =>
          import('./features/onboarding/pages/welcome/welcome').then((m) => m.Welcome),
      },

      {
        path: 'goal',
        loadComponent: () => import('./features/onboarding/pages/goal/goal').then((m) => m.Goal),
      },
    ],
  },

  {
    path: '**',
    redirectTo: 'splash',
  },
];
