import { Routes } from '@angular/router';

// --- GUARDS ---
import { blockGuard } from './auth.guard';

export const routes: Routes = [
  // 1. INICIO
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'home',
    loadComponent: () => import('./home.component').then(m => m.HomeComponent),
    canActivate: [blockGuard]
  },

  // 2. MAPA
  {
    path: 'map',
    loadComponent: () => import('./map.component').then(m => m.MapComponent),
    canActivate: [blockGuard]
  },

  // 3. FAVORITOS
  {
    path: 'favorites',
    loadComponent: () => import('./favorites.component').then(m => m.FavoritesComponent),
    canActivate: [blockGuard]
  },

  // 4. DETALLE DEL EVENTO
  {
    path: 'event/:id',
    loadComponent: () => import('./event-detail.component').then(m => m.EventDetailComponent),
    canActivate: [blockGuard]
  },

  // 5. AUTENTICACIÓN
  {
    path: 'auth',
    loadComponent: () => import('./auth.component').then(m => m.AuthComponent)
  },

  // 6. PERFIL Y DASHBOARD
  {
    path: 'profile',
    loadComponent: () => import('./profile.component').then(m => m.ProfileComponent),
    canActivate: [blockGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [blockGuard]
  },

  // 7. PÁGINA DE BLOQUEO
  {
    path: 'blocked',
    loadComponent: () => import('./blocked-page.component').then(m => m.BlockedPageComponent)
  },

  // 8. ONBOARDING
  {
    path: 'onboarding/interests',
    loadComponent: () => import('./user-interests.component').then(m => m.UserInterestsComponent)
  },
  {
    path: 'onboarding/verify',
    loadComponent: () => import('./organizer-verify.component').then(m => m.OrganizerVerifyComponent)
  },

  // 9. GESTIÓN DE EVENTOS
  {
    path: 'create-event',
    loadComponent: () => import('./create-event.component').then(m => m.CreateEventComponent),
    canActivate: [blockGuard]
  },
  {
    path: 'edit-event/:id',
    loadComponent: () => import('./create-event.component').then(m => m.CreateEventComponent),
    canActivate: [blockGuard]
  },

  // 10. CONFIGURACIÓN DE PLATAFORMA (Admin)
  {
    path: 'platform-config',
    loadComponent: () => import('./platform-config.component').then(m => m.PlatformConfigComponent),
    canActivate: [blockGuard]
  },

  // 11. POLÍTICA DE PRIVACIDAD
  {
    path: 'terminos',
    loadComponent: () => import('./privacy.component').then(m => m.PrivacyComponent)
  },

  // 12. SOBRE NOSOTROS
  {
    path: 'sobre-nosotros',
    loadComponent: () => import('./about.component').then(m => m.AboutComponent)
  },

  // 13. COMODÍN
  {
    path: '**',
    redirectTo: 'home'
  }
];