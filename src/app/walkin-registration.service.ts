import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

export interface WalkinAttendee {
  full_name: string;
  document_id: string;
  email: string;
  phone: string;
  age: number | null;
  accepts_communications: boolean;
}

export interface WalkinRegistrationResult {
  id: string;
  event_id: string;
  registered_at: string;
  notified_recipients: number;
}

export interface WalkinPublicEvent {
  id: string;
  title: string;
  location_name: string | null;
  date_event: string | null;
  image_url: string | null;
  organizer_name: string | null;
}

export interface WalkinRecipient {
  id: string;
  email: string;
  label: string | null;
  created_at: string;
}

/**
 * Servicio del flujo "Registro Express (Walk-in)".
 *
 * Pensado para ser compartido vía un enlace público oculto
 * (`/registro-express/:eventId`) sin pasar por el dashboard del organizador.
 *
 * Para la gestión de destinatarios (correos que reciben la notificación
 * en tiempo real) se intenta primero el backend; si éste no responde,
 * se cae a una persistencia local por evento para no bloquear al organizador.
 */
@Injectable({ providedIn: 'root' })
export class WalkinRegistrationService {
  private readonly recipientsKey = (eventId: string) =>
    `vemo_walkin_recipients_${eventId}`;

  private authHeaders(): Record<string, string> {
    const token =
      localStorage.getItem('vemo_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /** Datos públicos mínimos del evento para mostrar en el formulario walk-in. */
  async getPublicEvent(eventId: string): Promise<WalkinPublicEvent> {
    const res = await fetch(
      `${environment.apiUrl}/api/events/${encodeURIComponent(eventId)}/public-summary`
    );
    if (!res.ok) {
      throw new Error(
        res.status === 404
          ? 'El evento no existe o el link de registro express ya no está activo.'
          : 'No se pudo cargar la información del evento.'
      );
    }
    return (await res.json()) as WalkinPublicEvent;
  }

  /** Envía el registro express. El backend debe disparar el correo de notificación. */
  async submitRegistration(
    eventId: string,
    attendee: WalkinAttendee
  ): Promise<WalkinRegistrationResult> {
    const payload = this.sanitizeAttendee(attendee);
    const res = await fetch(
      `${environment.apiUrl}/api/events/${encodeURIComponent(eventId)}/walkin-register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      const message =
        (detail && (detail.error || detail.message)) ||
        (res.status === 409
          ? 'Ya existe un registro para este correo en este evento.'
          : 'No pudimos completar el registro. Intenta de nuevo.');
      throw new Error(message);
    }
    return (await res.json()) as WalkinRegistrationResult;
  }

  /** Lista de correos a notificar (intenta backend → cae a cache local por evento). */
  async getRecipients(eventId: string): Promise<WalkinRecipient[]> {
    try {
      const res = await fetch(
        `${environment.apiUrl}/api/events/${encodeURIComponent(eventId)}/walkin-recipients`,
        { headers: this.authHeaders() }
      );
      if (res.ok) {
        const data = (await res.json()) as WalkinRecipient[];
        this.persistLocalRecipients(eventId, data);
        return data;
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          'No tienes permisos para gestionar las notificaciones de este evento.'
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('permisos')) throw err;
      // Backend offline: usamos el snapshot local
    }
    return this.readLocalRecipients(eventId);
  }

  /** Agrega un nuevo destinatario al evento. */
  async addRecipient(
    eventId: string,
    email: string,
    label?: string
  ): Promise<WalkinRecipient> {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!this.isValidEmail(cleanEmail)) {
      throw new Error('El correo no tiene un formato válido.');
    }
    const cleanLabel = (label || '').trim() || null;
    try {
      const res = await fetch(
        `${environment.apiUrl}/api/events/${encodeURIComponent(eventId)}/walkin-recipients`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.authHeaders()
          },
          body: JSON.stringify({ email: cleanEmail, label: cleanLabel })
        }
      );
      if (res.ok) {
        const saved = (await res.json()) as WalkinRecipient;
        const all = this.readLocalRecipients(eventId).filter(
          r => r.email !== saved.email
        );
        all.push(saved);
        this.persistLocalRecipients(eventId, all);
        return saved;
      }
      if (res.status === 409) {
        throw new Error('Este correo ya está en la lista de notificaciones.');
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          'No tienes permisos para gestionar las notificaciones de este evento.'
        );
      }
    } catch (err) {
      const isAppError =
        err instanceof Error &&
        (err.message.includes('correo') || err.message.includes('permisos'));
      if (isAppError) throw err;
      // Backend caído → fallback local
    }
    const local = this.readLocalRecipients(eventId);
    if (local.some(r => r.email === cleanEmail)) {
      throw new Error('Este correo ya está en la lista de notificaciones.');
    }
    const offline: WalkinRecipient = {
      id: `local-${Date.now()}`,
      email: cleanEmail,
      label: cleanLabel,
      created_at: new Date().toISOString()
    };
    local.push(offline);
    this.persistLocalRecipients(eventId, local);
    return offline;
  }

  /** Elimina un destinatario por id. */
  async removeRecipient(eventId: string, recipientId: string): Promise<void> {
    try {
      const res = await fetch(
        `${environment.apiUrl}/api/events/${encodeURIComponent(eventId)}/walkin-recipients/${encodeURIComponent(recipientId)}`,
        { method: 'DELETE', headers: this.authHeaders() }
      );
      if (!res.ok && res.status !== 404) {
        if (res.status === 401 || res.status === 403) {
          throw new Error(
            'No tienes permisos para gestionar las notificaciones de este evento.'
          );
        }
        throw new Error('No se pudo eliminar el correo.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('permisos')) throw err;
      // Continuamos para limpiar la copia local — el organizador no debería
      // quedar bloqueado si el backend está temporalmente caído.
    }
    const local = this.readLocalRecipients(eventId).filter(
      r => r.id !== recipientId
    );
    this.persistLocalRecipients(eventId, local);
  }

  private sanitizeAttendee(attendee: WalkinAttendee): WalkinAttendee {
    return {
      full_name: (attendee.full_name || '').trim(),
      document_id: (attendee.document_id || '').trim(),
      email: (attendee.email || '').trim().toLowerCase(),
      phone: (attendee.phone || '').trim(),
      age:
        attendee.age !== null && !Number.isNaN(attendee.age)
          ? Number(attendee.age)
          : null,
      accepts_communications: Boolean(attendee.accepts_communications)
    };
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  private readLocalRecipients(eventId: string): WalkinRecipient[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.recipientsKey(eventId));
      if (!raw) return [];
      const parsed = JSON.parse(raw) as WalkinRecipient[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistLocalRecipients(
    eventId: string,
    recipients: WalkinRecipient[]
  ): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        this.recipientsKey(eventId),
        JSON.stringify(recipients)
      );
    } catch {
      // localStorage lleno o bloqueado — no es crítico, seguimos.
    }
  }
}
