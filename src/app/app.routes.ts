import { Routes } from '@angular/router';

// --- COMPONENTES ---
import { HomeComponent } from './home.component';
import { ProfileComponent } from './profile.component';
import { FavoritesComponent } from './favorites.component';
import { MapComponent } from './map.component'; // <--- IMPORTANTE: Importar el Mapa
import { AuthComponent } from './auth.component';
import { UserInterestsComponent } from './user-interests.component';
import { OrganizerVerifyComponent } from './organizer-verify.component';
import { AdminDashboardComponent } from './admin-dashboard.component';
import { BlockedPageComponent } from './blocked-page.component';
import { CreateEventComponent } from './create-event.component';
import { EventDetailComponent } from './event-detail.component';

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
    component: HomeComponent, 
    canActivate: [blockGuard] 
  },

  // 2. MAPA (¡Esta es la que faltaba!)
  { 
    path: 'map', 
    component: MapComponent,
    canActivate: [blockGuard]
  },

  // 3. FAVORITOS
  { 
    path: 'favorites', 
    component: FavoritesComponent,
    canActivate: [blockGuard]
  },

  // 4. DETALLE DEL EVENTO
  { 
    path: 'event/:id', 
    component: EventDetailComponent,
    canActivate: [blockGuard]
  },

  // 5. AUTENTICACIÓN
  { 
    path: 'auth', 
    component: AuthComponent 
  },
  
  // 6. PERFIL Y DASHBOARD
  { 
    path: 'profile', 
    component: ProfileComponent, 
    canActivate: [blockGuard] 
  },
  { 
    path: 'dashboard', 
    component: AdminDashboardComponent, 
    canActivate: [blockGuard] 
  },

  // 7. PÁGINA DE BLOQUEO
  { 
    path: 'blocked', 
    component: BlockedPageComponent 
  },

  // 8. ONBOARDING
  { 
    path: 'onboarding/interests', 
    component: UserInterestsComponent 
  },
  { 
    path: 'onboarding/verify', 
    component: OrganizerVerifyComponent 
  },

  // 9. GESTIÓN DE EVENTOS
  { 
    path: 'create-event', 
    component: CreateEventComponent, 
    canActivate: [blockGuard] 
  },
  { 
    path: 'edit-event/:id', 
    component: CreateEventComponent, 
    canActivate: [blockGuard] 
  },

  // 10. COMODÍN
  { 
    path: '**', 
    redirectTo: 'home' 
  }
];