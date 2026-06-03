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

  shareUrl = '';
  copyOk = false;

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
    this.shareUrl = `${window.location.origin}/registro-express/${this.eventId}`;
    await Promise.all([this.loadEvent(), this.loadRecipients()]);
    this.loading = false;
    this.cdr.detectChanges();
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
        err instanceof Error
          ? err.message
          : 'No se pudo agregar el correo.';
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
        err instanceof Error
          ? err.message
          : 'No se pudo eliminar el correo.';
    } finally {
      this.cdr.detectChanges();
    }
  }

  async copyShareUrl(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.shareUrl);
      this.copyOk = true;
      setTimeout(() => {
        this.copyOk = false;
        this.cdr.detectChanges();
      }, 1800);
    } catch {
      // En navegadores muy antiguos podría no estar disponible.
      window.prompt('Copia el link manualmente:', this.shareUrl);
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
}
