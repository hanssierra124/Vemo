import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav-bar.html',
  styleUrl: './nav-bar.css'
})
export class NavBar implements OnInit {
  // Señales: en modo zoneless disparan change detection automáticamente
  // (no dependemos de Zone.js para refrescar la barra tras el fetch).
  readonly isAdmin = signal(false);
  readonly isLoggedIn = signal(false);
  readonly myId = signal<string | null>(null);
  readonly unreadCount = signal(0);

  ngOnInit() {
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
}
