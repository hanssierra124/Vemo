import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  WalkinRegistrationService,
  WalkinAttendee,
  WalkinPublicEvent
} from './walkin-registration.service';

type FormState = 'idle' | 'submitting' | 'success';

@Component({
  selector: 'app-walkin-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './walkin-register.component.html',
  styleUrls: ['./walkin-register.component.css']
})
export class WalkinRegisterComponent implements OnInit {
  eventId = '';
  event: WalkinPublicEvent | null = null;

  loadingEvent = true;
  eventError = '';

  state: FormState = 'idle';
  submitError = '';
  notifiedCount = 0;

  attendee: WalkinAttendee = {
    full_name: '',
    document_id: '',
    email: '',
    phone: '',
    age: null,
    accepts_communications: true
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private walkin: WalkinRegistrationService
  ) {}

  async ngOnInit(): Promise<void> {
    this.eventId = this.route.snapshot.paramMap.get('eventId') || '';
    if (!this.eventId) {
      this.loadingEvent = false;
      this.eventError = 'El enlace de registro express no es válido.';
      this.cdr.detectChanges();
      return;
    }
    await this.loadEvent();
  }

  private async loadEvent(): Promise<void> {
    this.loadingEvent = true;
    this.eventError = '';
    try {
      this.event = await this.walkin.getPublicEvent(this.eventId);
    } catch (err) {
      this.eventError =
        err instanceof Error
          ? err.message
          : 'No se pudo cargar el evento.';
    } finally {
      this.loadingEvent = false;
      this.cdr.detectChanges();
    }
  }

  isValidEmail(email: string): boolean {
    return this.walkin.isValidEmail(email);
  }

  async submit(form: NgForm): Promise<void> {
    if (this.state === 'submitting') return;
    if (form.invalid || !this.isValidEmail(this.attendee.email)) {
      Object.values(form.controls).forEach(c => c.markAsTouched());
      return;
    }
    this.state = 'submitting';
    this.submitError = '';
    try {
      const result = await this.walkin.submitRegistration(
        this.eventId,
        this.attendee
      );
      this.notifiedCount = result.notified_recipients ?? 0;
      this.state = 'success';
    } catch (err) {
      this.submitError =
        err instanceof Error
          ? err.message
          : 'No pudimos completar el registro. Intenta de nuevo.';
      this.state = 'idle';
    } finally {
      this.cdr.detectChanges();
    }
  }

  registerAnother(): void {
    this.attendee = {
      full_name: '',
      document_id: '',
      email: '',
      phone: '',
      age: null,
      accepts_communications: true
    };
    this.submitError = '';
    this.notifiedCount = 0;
    this.state = 'idle';
    this.cdr.detectChanges();
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  }

  goHome(): void {
    this.router.navigate(['/home']);
  }
}
