import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';

// ════════════════════════════════════════════════════════════════════
// REGISTRO EXPRESS (Walk-in) — modelo de datos
//
// Qué se le pide al asistente NO registrado y por qué. El orden de los
// bloques es el orden en que se capturan en el formulario público
// (`/registro-express/:eventId`), un paso por bloque:
//
//   PASO 1 · IDENTIDAD  — control de acceso y listado en puerta.
//   PASO 2 · CONTACTO   — notificar al asistente y poder reconectar.
//   PASO 3 · CONTEXTO   — aforo real, atribución y afinidad (opcional).
//   CONSENTIMIENTOS     — habeas data (obligatorio) + comunicaciones y
//                         creación de cuenta (opcionales).
//
// `source` NO se pregunta: se deduce del parámetro `?src=` que viaja en
// el enlace/QR compartido por el organizador.
// ════════════════════════════════════════════════════════════════════

export type WalkinDocumentType = 'CC' | 'TI' | 'CE' | 'PPT' | 'PAS';
export type WalkinCompanyType = 'solo' | 'pareja' | 'amigos' | 'familia';
export type WalkinSource = 'qr' | 'whatsapp' | 'link' | 'taquilla';

export interface WalkinAttendee {
  // ── Paso 1 · Identidad ──
  full_name: string;
  document_type: WalkinDocumentType;
  document_id: string;

  // ── Paso 2 · Contacto ──
  phone: string;
  email: string;

  // ── Paso 3 · Contexto (todo opcional) ──
  age: number | null;
  companions: number | null;
  company_type: WalkinCompanyType | null;
  heard_from: string | null;
  interests: string[];

  // ── Consentimientos ──
  accepts_data_policy: boolean;
  accepts_communications: boolean;
  wants_account: boolean;

  // ── Metadatos capturados solos ──
  source: WalkinSource;
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

export interface WalkinCategory {
  id: string;
  name: string;
  icon: string | null;
}

/** Comprobante que se le entrega al asistente tras registrarse. */
export interface WalkinPass {
  code: string;
  registrationId: string;
  eventId: string;
  eventTitle: string;
  fullName: string;
  registeredAt: string;
}

/** Estado inicial del formulario — una sola fuente de verdad. */
export function emptyWalkinAttendee(source: WalkinSource = 'link'): WalkinAttendee {
  return {
    full_name: '',
    document_type: 'CC',
    document_id: '',
    phone: '',
    email: '',
    age: null,
    companions: null,
    company_type: null,
    heard_from: null,
    interests: [],
    accepts_data_policy: false,
    accepts_communications: true,
    wants_account: false,
    source
  };
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
  private readonly draftKey = (eventId: string) => `vemo_walkin_draft_${eventId}`;
  private readonly passKey = (eventId: string) => `vemo_walkin_pass_${eventId}`;

  /** Campos que el backend original no conoce; se reintenta sin ellos si los rechaza. */
  private readonly extendedFields: (keyof WalkinAttendee)[] = [
    'document_type',
    'companions',
    'company_type',
    'heard_from',
    'interests',
    'accepts_data_policy',
    'wants_account',
    'source'
  ];

  private authHeaders(): Record<string, string> {
    const token =
      localStorage.getItem('vemo_token') || localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // ── Enlaces compartibles ───────────────────────────────────────────

  /** URL pública del formulario. `src` permite medir de dónde llegó cada registro. */
  buildShareUrl(eventId: string, source: WalkinSource = 'link'): string {
    const base = `${window.location.origin}/registro-express/${encodeURIComponent(eventId)}`;
    return source === 'link' ? base : `${base}?src=${source}`;
  }

  /** URL del panel privado del organizador para este evento. */
  buildAdminUrl(eventId: string): string {
    return `${window.location.origin}/registro-express/${encodeURIComponent(eventId)}/admin`;
  }

  /** Genera un QR como data URL. `size` alto (1024) sirve para imprimir. */
  async buildQrDataUrl(text: string, size = 320): Promise<string> {
    const QRCode = (await import('qrcode')).default;
    return QRCode.toDataURL(text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0E0D12', light: '#FFFFFF' }
    });
  }

  // ── Datos del evento ───────────────────────────────────────────────

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

  /**
   * Categorías para el paso opcional de intereses. Si el backend falla no es
   * crítico: el formulario simplemente oculta ese bloque.
   */
  async getCategories(): Promise<WalkinCategory[]> {
    try {
      const res = await fetch(`${environment.apiUrl}/api/categories`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? (data as WalkinCategory[]) : [];
    } catch {
      return [];
    }
  }

  // ── Registro ───────────────────────────────────────────────────────

  /**
   * Envía el registro express. El backend debe disparar el correo de notificación.
   *
   * Se manda el payload completo; si un backend antiguo rechaza los campos
   * nuevos (400/422) se reintenta una sola vez con el payload mínimo, para que
   * un asistente en la puerta nunca quede bloqueado por un despliegue desfasado.
   */
  async submitRegistration(
    eventId: string,
    attendee: WalkinAttendee
  ): Promise<WalkinRegistrationResult> {
    const full = this.sanitizeAttendee(attendee);
    try {
      return await this.postRegistration(eventId, full);
    } catch (err) {
      const retryable = err instanceof WalkinPayloadError;
      if (!retryable) throw err;
      return this.postRegistration(eventId, this.toLegacyPayload(full));
    }
  }

  private async postRegistration(
    eventId: string,
    payload: Record<string, unknown>
  ): Promise<WalkinRegistrationResult> {
    const res = await fetch(
      `${environment.apiUrl}/api/events/${encodeURIComponent(eventId)}/walkin-register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }
    );
    if (!res.ok) {
      const detail = await res.json().catch(() => ({} as any));
      const message =
        (detail && (detail.error || detail.message)) ||
        (res.status === 409
          ? 'Ya existe un registro para este correo en este evento.'
          : 'No pudimos completar el registro. Intenta de nuevo.');
      // Sólo los 400/422 con campos extendidos son candidatos a reintento.
      const hasExtended = this.extendedFields.some(f => f in payload);
      if ((res.status === 400 || res.status === 422) && hasExtended) {
        throw new WalkinPayloadError(message);
      }
      throw new Error(message);
    }
    return (await res.json()) as WalkinRegistrationResult;
  }

  /** Payload reducido al contrato original del backend. */
  private toLegacyPayload(payload: Record<string, unknown>): Record<string, unknown> {
    const legacy: Record<string, unknown> = { ...payload };
    for (const field of this.extendedFields) delete legacy[field];
    return legacy;
  }

  private sanitizeAttendee(attendee: WalkinAttendee): Record<string, unknown> {
    const heard = (attendee.heard_from || '').trim();
    return {
      full_name: (attendee.full_name || '').trim().replace(/\s+/g, ' '),
      document_type: attendee.document_type || 'CC',
      document_id: (attendee.document_id || '').trim().replace(/\s+/g, ''),
      email: (attendee.email || '').trim().toLowerCase(),
      phone: this.normalizePhone(attendee.phone),
      age:
        attendee.age !== null && !Number.isNaN(Number(attendee.age))
          ? Number(attendee.age)
          : null,
      companions:
        attendee.companions !== null && !Number.isNaN(Number(attendee.companions))
          ? Number(attendee.companions)
          : null,
      company_type: attendee.company_type || null,
      heard_from: heard || null,
      interests: Array.isArray(attendee.interests) ? attendee.interests : [],
      accepts_data_policy: Boolean(attendee.accepts_data_policy),
      accepts_communications: Boolean(attendee.accepts_communications),
      wants_account: Boolean(attendee.wants_account),
      source: attendee.source || 'link'
    };
  }

  // ── Destinatarios de notificación ──────────────────────────────────

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

  // ── Validación / normalización ─────────────────────────────────────

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  /** Cuenta sólo dígitos: sirve para validar teléfonos escritos con espacios. */
  phoneDigits(phone: string): string {
    return (phone || '').replace(/\D/g, '');
  }

  isValidPhone(phone: string): boolean {
    const digits = this.phoneDigits(phone);
    return digits.length >= 7 && digits.length <= 15;
  }

  /**
   * Deja el teléfono en formato internacional cuando reconoce un celular
   * colombiano (10 dígitos que empiezan por 3). Así los enlaces de WhatsApp
   * del organizador funcionan sin editar nada a mano.
   */
  normalizePhone(phone: string): string {
    const raw = (phone || '').trim();
    if (!raw) return '';
    const digits = this.phoneDigits(raw);
    if (raw.startsWith('+')) return `+${digits}`;
    if (digits.length === 10 && digits.startsWith('3')) return `+57${digits}`;
    if (digits.length === 12 && digits.startsWith('57')) return `+${digits}`;
    return digits;
  }

  // ── Persistencia local (borrador y comprobante) ────────────────────

  /** Guarda lo escrito para que un refresco o un cierre accidental no lo borre. */
  saveDraft(eventId: string, attendee: WalkinAttendee): void {
    this.writeStorage(this.draftKey(eventId), attendee);
  }

  readDraft(eventId: string): WalkinAttendee | null {
    const stored = this.readStorage<Partial<WalkinAttendee>>(this.draftKey(eventId));
    if (!stored) return null;
    return { ...emptyWalkinAttendee(stored.source ?? 'link'), ...stored };
  }

  clearDraft(eventId: string): void {
    this.removeStorage(this.draftKey(eventId));
  }

  /** El comprobante sobrevive al cierre de la pestaña: se puede volver a abrir. */
  savePass(eventId: string, pass: WalkinPass): void {
    this.writeStorage(this.passKey(eventId), pass);
  }

  readPass(eventId: string): WalkinPass | null {
    return this.readStorage<WalkinPass>(this.passKey(eventId));
  }

  clearPass(eventId: string): void {
    this.removeStorage(this.passKey(eventId));
  }

  /** Código corto y legible para cantar en la puerta si falla el escáner. */
  buildPassCode(registrationId: string, document: string): string {
    const tail = (registrationId || '').replace(/-/g, '').slice(-4).toUpperCase();
    const doc = this.phoneDigits(document).slice(-3);
    return `VM-${doc || '000'}${tail || Date.now().toString(36).slice(-4).toUpperCase()}`;
  }

  private readLocalRecipients(eventId: string): WalkinRecipient[] {
    const stored = this.readStorage<WalkinRecipient[]>(this.recipientsKey(eventId));
    return Array.isArray(stored) ? stored : [];
  }

  private persistLocalRecipients(
    eventId: string,
    recipients: WalkinRecipient[]
  ): void {
    this.writeStorage(this.recipientsKey(eventId), recipients);
  }

  private readStorage<T>(key: string): T | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  private writeStorage(key: string, value: unknown): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage lleno o bloqueado — no es crítico, seguimos.
    }
  }

  private removeStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch {
      // idem
    }
  }
}

/** Error interno: el backend rechazó el payload extendido y toca reintentar. */
class WalkinPayloadError extends Error {}
