// ════════════════════════════════════════════════════════════════════
// WalkinAdminComponent — panel privado del Registro Express.
//
// Es la caja de herramientas del organizador para UN evento:
//   · repartir el acceso (QR imprimible, link, WhatsApp, compartir nativo)
//   · decidir quién recibe el aviso por correo de cada registro
//
// Cada canal lleva su propio `?src=` para que después se pueda saber
// por dónde entró la gente sin preguntárselo a nadie.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  WalkinRegistrationService,
  WalkinPublicEvent,
  WalkinRecipient
} from './walkin-registration.service';

@Component({
  selector: 'app-walkin-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './walkin-admin.component.html',
  styleUrls: ['./walkin-admin.component.css']
})
export class WalkinAdminComponent implements OnInit {
  eventId = '';
  event: WalkinPublicEvent | null = null;

  loading = true;
  eventError = '';

  recipients: WalkinRecipient[] = [];
  recipientsLoading = false;
  recipientsError = '';

  newEmail = '';
  newLabel = '';
  adding = false;
  formError = '';

  /** Link "limpio" que se muestra en pantalla (sin parámetros de medición). */
  shareUrl = '';
  adminUrl = '';

  qrDataUrl = '';
  qrPrintUrl = '';
  qrError = '';

  copyOk = false;
  copyAdminOk = false;

  get canShareNatively(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).share;
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private walkin: WalkinRegistrationService
  ) {}

  async ngOnInit(): Promise<void> {
    this.eventId = this.route.snapshot.paramMap.get('eventId') || '';
    if (!this.eventId) {
      this.loading = false;
      this.eventError = 'El enlace no es válido.';
      this.cdr.detectChanges();
      return;
    }
    this.shareUrl = this.walkin.buildShareUrl(this.eventId);
    this.adminUrl = this.walkin.buildAdminUrl(this.eventId);

    await Promise.all([this.loadEvent(), this.loadRecipients()]);
    this.loading = false;
    this.cdr.detectChanges();

    void this.buildQr();
  }

  private async loadEvent(): Promise<void> {
    try {
      this.event = await this.walkin.getPublicEvent(this.eventId);
    } catch (err) {
      this.eventError =
        err instanceof Error ? err.message : 'No se pudo cargar el evento.';
    }
  }

  private async loadRecipients(): Promise<void> {
    this.recipientsLoading = true;
    this.recipientsError = '';
    try {
      this.recipients = await this.walkin.getRecipients(this.eventId);
    } catch (err) {
      this.recipientsError =
        err instanceof Error
          ? err.message
          : 'No se pudieron cargar los destinatarios.';
    } finally {
      this.recipientsLoading = false;
      this.cdr.detectChanges();
    }
  }

  // ── QR ─────────────────────────────────────────────────────────────

  /**
   * Dos versiones del mismo QR: una para pantalla y otra de 1024px para
   * que al imprimirla o proyectarla no se vea pixelada.
   */
  private async buildQr(): Promise<void> {
    this.qrError = '';
    const qrTarget = this.walkin.buildShareUrl(this.eventId, 'qr');
    try {
      const [screen, print] = await Promise.all([
        this.walkin.buildQrDataUrl(qrTarget, 360),
        this.walkin.buildQrDataUrl(qrTarget, 1024)
      ]);
      this.qrDataUrl = screen;
      this.qrPrintUrl = print;
    } catch {
      this.qrError = 'No se pudo generar el QR. Recarga la página.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  /** Descarga el QR en alta resolución, listo para pegarlo en un arte. */
  downloadQr(): void {
    if (!this.qrPrintUrl) return;
    const link = document.createElement('a');
    link.href = this.qrPrintUrl;
    link.download = `vemo-qr-registro-${this.slug()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /** Imprime sólo el cartel (el CSS de @media print oculta el resto). */
  printPoster(): void {
    window.print();
  }

  private slug(): string {
    const base = (this.event?.title || this.eventId).toLowerCase();
    return (
      base
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'evento'
    );
  }

  // ── Compartir ──────────────────────────────────────────────────────

  /** Mensaje base. Sin `url` cuando quien comparte ya adjunta el enlace aparte. */
  private shareMessage(url?: string): string {
    const title = this.event?.title || 'nuestro evento';
    const invite = `¡Estás invitado a ${title}! Regístrate en 30 segundos`;
    return url ? `${invite}: ${url}` : `${invite}.`;
  }

  /** Compartir nativo del sistema (WhatsApp, Telegram, AirDrop, etc.). */
  async shareNative(): Promise<void> {
    const url = this.walkin.buildShareUrl(this.eventId, 'whatsapp');
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (!nav.share) {
      await this.copyShareUrl();
      return;
    }
    try {
      await nav.share({
        title: this.event?.title || 'Registro Express · Vemo',
        text: this.shareMessage(),
        url
      });
    } catch {
      // Cancelado por el usuario: no hay nada que reportar.
    }
  }

  /** Abre WhatsApp con el mensaje ya escrito. */
  shareWhatsApp(): void {
    const url = this.walkin.buildShareUrl(this.eventId, 'whatsapp');
    const text = encodeURIComponent(this.shareMessage(url));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  /** Abre el cliente de correo con asunto y cuerpo listos. */
  shareEmail(): void {
    const url = this.walkin.buildShareUrl(this.eventId, 'link');
    const subject = encodeURIComponent(
      `Registro para ${this.event?.title || 'el evento'}`
    );
    const body = encodeURIComponent(`${this.shareMessage(url)}\n\n— Equipo Vemo`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  async copyShareUrl(): Promise<void> {
    const ok = await this.copyText(this.shareUrl);
    if (ok) {
      this.copyOk = true;
      setTimeout(() => {
        this.copyOk = false;
        this.cdr.detectChanges();
      }, 1800);
    }
    this.cdr.detectChanges();
  }

  async copyAdminUrl(): Promise<void> {
    const ok = await this.copyText(this.adminUrl);
    if (ok) {
      this.copyAdminOk = true;
      setTimeout(() => {
        this.copyAdminOk = false;
        this.cdr.detectChanges();
      }, 1800);
    }
    this.cdr.detectChanges();
  }

  /** Clipboard API con red de seguridad para navegadores viejos o sin HTTPS. */
  private async copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.setAttribute('readonly', '');
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      let ok = false;
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      helper.remove();
      if (!ok) window.prompt('Copia el link manualmente:', text);
      return ok;
    }
  }

  // ── Destinatarios ──────────────────────────────────────────────────

  async addRecipient(): Promise<void> {
    if (this.adding) return;
    const email = (this.newEmail || '').trim().toLowerCase();
    if (!this.walkin.isValidEmail(email)) {
      this.formError = 'Ingresa un correo válido.';
      return;
    }
    this.adding = true;
    this.formError = '';
    try {
      const saved = await this.walkin.addRecipient(
        this.eventId,
        email,
        this.newLabel
      );
      this.recipients = [
        ...this.recipients.filter(r => r.email !== saved.email),
        saved
      ];
      this.newEmail = '';
      this.newLabel = '';
    } catch (err) {
      this.formError =
        err instanceof Error ? err.message : 'No se pudo agregar el correo.';
    } finally {
      this.adding = false;
      this.cdr.detectChanges();
    }
  }

  async removeRecipient(recipient: WalkinRecipient): Promise<void> {
    const ok = window.confirm(
      `¿Quitar a ${recipient.email} de las notificaciones?`
    );
    if (!ok) return;
    const previous = this.recipients;
    this.recipients = this.recipients.filter(r => r.id !== recipient.id);
    try {
      await this.walkin.removeRecipient(this.eventId, recipient.id);
    } catch (err) {
      this.recipients = previous;
      this.recipientsError =
        err instanceof Error ? err.message : 'No se pudo eliminar el correo.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  trackById(_: number, item: WalkinRecipient): string {
    return item.id;
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }

  goToEvent(): void {
    this.router.navigate(['/event', this.eventId]);
  }
}
