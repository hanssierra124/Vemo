import { environment } from '../environments/environment';
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const blockGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const token = localStorage.getItem('vemo_token');

  if (!token) return of(true);

  return http.get<any>(`${environment.apiUrl}/api/auth/profile?t=${Date.now()}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).pipe(
    map(res => {
      // 1. Los administradores pasan siempre
      if (res.user?.role === 'admin') return true;
      // 2. SOLO bloqueamos si el estado es RECHAZADO
      if (res.user?.verification_status === 'rejected') {
        router.navigate(['/blocked']);
        return false;
      }
      // 3. Dejamos ver Inicio y Perfil para todo lo demás
      return true;
    }),
    catchError(() => of(true)) // Evitamos bloqueos por caídas de red
  );
};