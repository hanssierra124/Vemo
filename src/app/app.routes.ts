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

  // 13. EXPERIENCIAS
  {
    path: 'experiencias',
    loadComponent: () => import('./experiencias.component').then(m => m.ExperienciasComponent),
    canActivate: [blockGuard]
  },

  // 14. EVENTO PRIVADO (link compartible)
  {
    path: 'eventos/privado/:token',
    loadComponent: () => import('./private-event.component').then(m => m.PrivateEventComponent)
  },

  // 15. REGISTRO EXPRESS (Walk-in) — enlace público oculto.
  // Panel del organizador para gestionar los correos que reciben la
  // notificación automática. NO se enlaza desde el dashboard principal:
  // se accede manualmente por URL.
  {
    path: 'registro-express/:eventId/admin',
    loadComponent: () =>
      import('./walkin-admin.component').then(m => m.WalkinAdminComponent),
    canActivate: [blockGuard]
  },
  // Formulario público para asistentes de último minuto.
  {
    path: 'registro-express/:eventId',
    loadComponent: () =>
      import('./walkin-register.component').then(m => m.WalkinRegisterComponent)
  },

  // 16. RESEÑAS — FEED SOCIAL Y PERFILES PÚBLICOS (Fase F3)
  {
    path: 'feed',
    loadComponent: () => import('./feed.component').then(m => m.FeedComponent),
    canActivate: [blockGuard]
  },
  {
    // Perfil público de usuario
    path: 'u/:id',
    loadComponent: () => import('./user-profile.component').then(m => m.UserProfileComponent)
  },
  {
    // Perfil público de organizador
    path: 'organizer/:id',
    loadComponent: () => import('./organizer-profile.component').then(m => m.OrganizerProfileComponent)
  },

  // 16a. MIS EVENTOS (Asistiré Inteligente — Fase A1)
  {
    path: 'mis-eventos',
    loadComponent: () => import('./my-events.component').then(m => m.MyEventsComponent),
    canActivate: [blockGuard]
  },

  // 16c. CHECK-IN (Asistiré Inteligente — Fase A2): destino del QR del evento
  {
    path: 'checkin/:eventId',
    loadComponent: () => import('./checkin.component').then(m => m.CheckinComponent)
  },

  // 16d. ANALÍTICA DEL ORGANIZADOR (Asistiré Inteligente — Fase A3)
  {
    path: 'organizer/event/:id/analytics',
    loadComponent: () => import('./event-analytics.component').then(m => m.EventAnalyticsComponent),
    canActivate: [blockGuard]
  },

  // 16e. NOTIFICACIONES (Asistiré Inteligente — Fase A5)
  {
    path: 'notificaciones',
    loadComponent: () => import('./notifications.component').then(m => m.NotificationsComponent),
    canActivate: [blockGuard]
  },

  // 16f. DESCUBRIR — personas + eventos recomendados (Fase A6)
  {
    path: 'descubrir',
    loadComponent: () => import('./discover.component').then(m => m.DiscoverComponent),
    canActivate: [blockGuard]
  },

  // 16b. MODERACIÓN (cola admin — Fase F4). El backend exige rol admin.
  {
    path: 'admin/moderation',
    loadComponent: () => import('./moderation.component').then(m => m.ModerationComponent),
    canActivate: [blockGuard]
  },

  // 17. COMODÍN
  {
    path: '**',
    redirectTo: 'home'
  }
];