import {
  Component,
  signal,
  computed,
  OnInit,
  OnDestroy,
  HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * Un enlace de la navegación. Los iconos se guardan como lista de `d` de
 * `<path>` para poder pintar el MISMO enlace en la barra de escritorio y
 * en el cajón móvil sin duplicar el SVG en dos sitios del template.
 */
export interface NavLink {
  path: string;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
  icon: string[];
}

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar implements OnInit, OnDestroy {
  // Señales: en modo zoneless disparan change detection automáticamente
  // (no dependemos de Zone.js para refrescar la barra tras el fetch).
  readonly isAdmin = signal(false);
  readonly isLoggedIn = signal(false);
  readonly myId = signal<string | null>(null);
  readonly unreadCount = signal(0);

  /** Cajón de navegación móvil. */
  readonly menuOpen = signal(false);

  private readonly allLinks: NavLink[] = [
    {
      path: '/',
      label: 'Inicio',
      exact: true,
      icon: ['M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z']
    },
    {
      path: '/map',
      label: 'Explora',
      icon: ['M3 6 9 3l6 3 6-3v15l-6 3-6-3-6 3z', 'M9 3v15', 'M15 6v15']
    },
    {
      path: '/favorites',
      label: 'Favoritos',
      icon: ['M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z']
    },
    {
      path: '/feed',
      label: 'Feed',
      icon: ['M4 6h16', 'M4 12h16', 'M4 18h10']
    },
    {
      path: '/mis-eventos',
      label: 'Mis eventos',
      icon: [
        'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
        'M16 2v4',
        'M8 2v4',
        'M3 10h18'
      ]
    },
    {
      path: '/descubrir',
      label: 'Descubrir',
      icon: ['M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z', 'M21 21l-4.35-4.35']
    },
    {
      path: '/admin/moderation',
      label: 'Moderación',
      adminOnly: true,
      icon: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z']
    }
  ];

  /** Los enlaces que corresponden al usuario actual. */
  readonly links = computed(() =>
    this.allLinks.filter(l => !l.adminOnly || this.isAdmin())
  );

  private routerSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    // Al navegar, el cajón se cierra solo: si no, queda tapando la vista.
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.closeMenu());

    const token = localStorage.getItem('vemo_token') || localStorage.getItem('token');
    if (!token) return;
    this.isLoggedIn.set(true);
    // Resolvemos el rol una sola vez para decidir si mostramos "Moderación".
    fetch(`${environment.apiUrl}/api/auth/profile?t=${Date.now()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        const u = data?.user;
        if (!u) return;
        this.myId.set(u.id ?? null);
        this.isAdmin.set(u.role === 'admin');
      })
      .catch(() => { /* sin red: navbar pública */ });

    // Conteo de notificaciones no leídas (badge de la campana).
    fetch(`${environment.apiUrl}/api/me/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d && typeof d.count === 'number') this.unreadCount.set(d.count); })
      .catch(() => { /* sin red */ });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.setBodyScrollLock(false);
  }

  toggleMenu() {
    this.menuOpen.set(!this.menuOpen());
    this.setBodyScrollLock(this.menuOpen());
  }

  closeMenu() {
    if (!this.menuOpen()) return;
    this.menuOpen.set(false);
    this.setBodyScrollLock(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeMenu();
  }

  /** Evita que el fondo haga scroll mientras el cajón está abierto. */
  private setBodyScrollLock(locked: boolean) {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('vemo-no-scroll', locked);
  }

  trackByPath(_: number, link: NavLink) {
    return link.path;
  }
}
