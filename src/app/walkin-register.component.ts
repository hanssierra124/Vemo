// ════════════════════════════════════════════════════════════════════
// WalkinRegisterComponent — onboarding del asistente NO registrado.
//
// Llega por QR o link (`/registro-express/:eventId?src=qr`) y nunca ha
// visto Vemo. El flujo está partido en 3 pasos cortos para que en la
// puerta de un evento, con una mano y datos móviles, se complete en
// menos de un minuto:
//
//   1. Identidad  → nombre + documento          (obligatorio)
//   2. Contacto   → celular + correo            (obligatorio)
//   3. Contexto   → aforo, atribución, gustos   (opcional) + permisos
//
// Al terminar entrega un comprobante con código y QR, y ofrece convertir
// el registro en una cuenta Vemo sin volver a escribir nada.
// ════════════════════════════════════════════════════════════════════
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import {
  WalkinRegistrationService,
  WalkinAttendee,
  WalkinPublicEvent,
  WalkinCategory,
  WalkinPass,
  WalkinDocumentType,
  WalkinCompanyType,
  WalkinSource,
  emptyWalkinAttendee
} from './walkin-registration.service';

type Stage = 'form' | 'success';

@Component({
  selector: 'app-walkin-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './walkin-register.component.html',
  styleUrls: ['./walkin-register.component.css']
})
export class WalkinRegisterComponent implements OnInit {
  eventId = '';
  event: WalkinPublicEvent | null = null;

  loadingEvent = true;
  eventError = '';

  stage: Stage = 'form';
  step = 1;
  readonly totalSteps = 3;

  submitting = false;
  submitError = '';
  notifiedCount = 0;

  attendee: WalkinAttendee = emptyWalkinAttendee();
  touched: Record<string, boolean> = {};
  draftRestored = false;

  categories: WalkinCategory[] = [];

  pass: WalkinPass | null = null;
  passQr = '';
  shareFeedback = '';

  readonly documentTypes: { value: WalkinDocumentType; label: string }[] = [
    { value: 'CC', label: 'C.C.' },
    { value: 'TI', label: 'T.I.' },
    { value: 'CE', label: 'C.E.' },
    { value: 'PPT', label: 'PPT' },
    { value: 'PAS', label: 'Pasaporte' }
  ];

  readonly companyOptions: { value: WalkinCompanyType; label: string; icon: string }[] = [
    { value: 'solo', label: 'Solo/a', icon: '🚶' },
    { value: 'pareja', label: 'En pareja', icon: '💞' },
    { value: 'amigos', label: 'Con amigos', icon: '🎉' },
    { value: 'familia', label: 'En familia', icon: '👨‍👩‍👧' }
  ];

  readonly heardOptions = [
    'Instagram',
    'WhatsApp',
    'Un amigo',
    'Cartel / QR en el lugar',
    'Vemo',
    'Otro'
  ];

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

    const source = this.readSource();
    const draft = this.walkin.readDraft(this.eventId);
    if (draft) {
      this.attendee = { ...draft, source };
      this.draftRestored = !!(draft.full_name || draft.email || draft.phone);
    } else {
      this.attendee = emptyWalkinAttendee(source);
    }

    // Si ya se registró en este dispositivo, mostramos su comprobante.
    const savedPass = this.walkin.readPass(this.eventId);
    if (savedPass) {
      this.pass = savedPass;
      this.stage = 'success';
      void this.renderPassQr();
    }

    await this.loadEvent();
    void this.loadCategories();
  }

  /** `?src=` sólo se usa para atribución; cualquier valor raro cae en 'link'. */
  private readSource(): WalkinSource {
    const raw = (this.route.snapshot.queryParamMap.get('src') || '').toLowerCase();
    const allowed: WalkinSource[] = ['qr', 'whatsapp', 'link', 'taquilla'];
    return (allowed as string[]).includes(raw) ? (raw as WalkinSource) : 'link';
  }

  private async loadEvent(): Promise<void> {
    this.loadingEvent = true;
    this.eventError = '';
    try {
      this.event = await this.walkin.getPublicEvent(this.eventId);
    } catch (err) {
      this.eventError =
        err instanceof Error ? err.message : 'No se pudo cargar el evento.';
    } finally {
      this.loadingEvent = false;
      this.cdr.detectChanges();
    }
  }

  private async loadCategories(): Promise<void> {
    this.categories = await this.walkin.getCategories();
    this.cdr.detectChanges();
  }

  // ── Navegación por pasos ───────────────────────────────────────────

  get progressPct(): number {
    return Math.round(((this.step - 1) / this.totalSteps) * 100) + 12;
  }

  get stepTitle(): string {
    return this.step === 1
      ? '¿Quién eres?'
      : this.step === 2
        ? '¿Cómo te contactamos?'
        : 'Casi listo';
  }

  get stepHint(): string {
    return this.step === 1
      ? 'Necesitamos tu nombre y documento para dejarte entrar.'
      : this.step === 2
        ? 'Te avisamos cualquier cambio del evento por aquí.'
        : 'Esto es opcional y le sirve al organizador para recibirte mejor.';
  }

  private fieldsOfStep(step: number): string[] {
    if (step === 1) return ['full_name', 'document_id'];
    if (step === 2) return ['phone', 'email'];
    return ['age', 'companions', 'accepts_data_policy'];
  }

  stepHasErrors(step: number): boolean {
    return this.fieldsOfStep(step).some(f => !!this.errorFor(f));
  }

  next(): void {
    if (this.stepHasErrors(this.step)) {
      this.fieldsOfStep(this.step).forEach(f => (this.touched[f] = true));
      this.cdr.detectChanges();
      return;
    }
    this.persistDraft();
    this.step = Math.min(this.totalSteps, this.step + 1);
    this.scrollToTop();
    this.cdr.detectChanges();
  }

  back(): void {
    this.persistDraft();
    this.step = Math.max(1, this.step - 1);
    this.scrollToTop();
    this.cdr.detectChanges();
  }

  private scrollToTop(): void {
    try {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      window.scrollTo(0, 0);
    }
  }

  // ── Validación ─────────────────────────────────────────────────────

  markTouched(field: string): void {
    this.touched[field] = true;
    this.persistDraft();
  }

  showError(field: string): boolean {
    return !!this.touched[field] && !!this.errorFor(field);
  }

  errorFor(field: string): string | null {
    const a = this.attendee;
    switch (field) {
      case 'full_name': {
        const name = (a.full_name || '').trim();
        if (name.length < 3) return 'Escribe tu nombre completo.';
        if (!name.includes(' ')) return 'Incluye al menos un apellido.';
        return null;
      }
      case 'document_id': {
        const doc = (a.document_id || '').trim();
        if (doc.length < 4) return 'El número de documento es obligatorio.';
        if (doc.length > 20) return 'Ese documento es demasiado largo.';
        return null;
      }
      case 'phone': {
        if (!(a.phone || '').trim()) return 'Necesitamos un número de contacto.';
        if (!this.walkin.isValidPhone(a.phone))
          return 'Escribe un celular válido (mínimo 7 dígitos).';
        return null;
      }
      case 'email': {
        if (!(a.email || '').trim()) return 'Necesitamos tu correo.';
        if (!this.walkin.isValidEmail(a.email)) return 'Ese correo no parece válido.';
        return null;
      }
      case 'age': {
        if (a.age === null || (a.age as any) === '') return null;
        const age = Number(a.age);
        if (Number.isNaN(age) || age < 13 || age > 120)
          return 'La edad debe estar entre 13 y 120.';
        return null;
      }
      case 'companions': {
        if (a.companions === null || (a.companions as any) === '') return null;
        const n = Number(a.companions);
        if (Number.isNaN(n) || n < 0 || n > 20) return 'Máximo 20 acompañantes.';
        return null;
      }
      case 'accepts_data_policy':
        return a.accepts_data_policy
          ? null
          : 'Necesitamos tu autorización para tratar los datos.';
      default:
        return null;
    }
  }

  // ── Paso 3: chips ──────────────────────────────────────────────────

  selectCompany(value: WalkinCompanyType): void {
    this.attendee.company_type = this.attendee.company_type === value ? null : value;
    this.persistDraft();
  }

  selectHeardFrom(value: string): void {
    this.attendee.heard_from = this.attendee.heard_from === value ? null : value;
    this.persistDraft();
  }

  isInterest(id: string): boolean {
    return this.attendee.interests.includes(id);
  }

  toggleInterest(id: string): void {
    this.attendee.interests = this.isInterest(id)
      ? this.attendee.interests.filter(i => i !== id)
      : [...this.attendee.interests, id];
    this.persistDraft();
  }

  private persistDraft(): void {
    this.walkin.saveDraft(this.eventId, this.attendee);
  }

  // ── Envío ──────────────────────────────────────────────────────────

  async submit(): Promise<void> {
    if (this.submitting) return;

    // Un error de un paso anterior no debe quedar escondido.
    for (let s = 1; s <= this.totalSteps; s++) {
      if (this.stepHasErrors(s)) {
        this.fieldsOfStep(s).forEach(f => (this.touched[f] = true));
        this.step = s;
        this.scrollToTop();
        this.cdr.detectChanges();
        return;
      }
    }

    this.submitting = true;
    this.submitError = '';
    this.cdr.detectChanges();

    try {
      const result = await this.walkin.submitRegistration(this.eventId, this.attendee);
      this.notifiedCount = result.notified_recipients ?? 0;
      this.pass = {
        code: this.walkin.buildPassCode(result.id, this.attendee.document_id),
        registrationId: result.id,
        eventId: this.eventId,
        eventTitle: this.event?.title || 'Evento',
        fullName: (this.attendee.full_name || '').trim(),
        registeredAt: result.registered_at || new Date().toISOString()
      };
      this.walkin.savePass(this.eventId, this.pass);
      this.walkin.clearDraft(this.eventId);
      this.stage = 'success';
      this.scrollToTop();
      void this.renderPassQr();
    } catch (err) {
      this.submitError =
        err instanceof Error
          ? err.message
          : 'No pudimos completar el registro. Intenta de nuevo.';
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  // ── Comprobante ────────────────────────────────────────────────────

  private async renderPassQr(): Promise<void> {
    if (!this.pass) return;
    try {
      this.passQr = await this.walkin.buildQrDataUrl(this.passPayload(this.pass), 360);
    } catch {
      this.passQr = '';
    } finally {
      this.cdr.detectChanges();
    }
  }

  /** Lo que lee el escáner de la puerta: código legible + id de registro. */
  private passPayload(pass: WalkinPass): string {
    return `VEMO-WALKIN|${pass.code}|${pass.eventId}|${pass.registrationId}`;
  }

  /** Descarga el comprobante como imagen lista para mostrar u archivar. */
  async downloadPass(): Promise<void> {
    if (!this.pass) return;
    try {
      const qr = this.passQr || (await this.walkin.buildQrDataUrl(this.passPayload(this.pass), 360));
      const image = await this.composePassImage(this.pass, qr);
      const link = document.createElement('a');
      link.href = image;
      link.download = `vemo-registro-${this.pass.code}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      this.shareFeedback = 'No se pudo descargar la imagen. Toma una captura de pantalla.';
      this.cdr.detectChanges();
    }
  }

  /** Dibuja la tarjeta del comprobante en un canvas (evento, nombre, código y QR). */
  private composePassImage(pass: WalkinPass, qrDataUrl: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const W = 800;
      const H = 1160;
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('sin canvas'));
        return;
      }

      ctx.fillStyle = '#0E0D12';
      ctx.fillRect(0, 0, W, H);

      const band = ctx.createLinearGradient(0, 0, W, 220);
      band.addColorStop(0, '#FF4D80');
      band.addColorStop(1, '#6A00FF');
      ctx.fillStyle = band;
      ctx.fillRect(0, 0, W, 12);

      const sans = "600 34px 'Inter', system-ui, sans-serif";
      ctx.textAlign = 'center';

      ctx.fillStyle = '#FF4D80';
      ctx.font = "700 26px 'Inter', system-ui, sans-serif";
      ctx.fillText('VEMO · REGISTRO EXPRESS', W / 2, 86);

      ctx.fillStyle = '#F0F0F0';
      ctx.font = sans;
      // Recortado para que un título largo no invada el bloque del nombre.
      const title = pass.eventTitle.length > 58
        ? `${pass.eventTitle.slice(0, 55)}…`
        : pass.eventTitle;
      this.wrapCanvasText(ctx, title.toUpperCase(), W / 2, 150, W - 120, 44);

      ctx.fillStyle = 'rgba(240,240,240,0.55)';
      ctx.font = "400 24px 'Inter', system-ui, sans-serif";
      ctx.fillText('ASISTENTE', W / 2, 268);
      ctx.fillStyle = '#F0F0F0';
      ctx.font = "600 32px 'Inter', system-ui, sans-serif";
      this.wrapCanvasText(ctx, pass.fullName, W / 2, 312, W - 120, 40);

      const qr = new Image();
      qr.onload = () => {
        const size = 380;
        const x = (W - size) / 2;
        const y = 380;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 18, y - 18, size + 36, size + 36);
        ctx.drawImage(qr, x, y, size, size);

        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(240,240,240,0.55)';
        ctx.font = "400 24px 'Inter', system-ui, sans-serif";
        ctx.fillText('CÓDIGO DE REGISTRO', W / 2, y + size + 92);

        ctx.fillStyle = '#FFD700';
        ctx.font = "700 56px 'Inter', system-ui, sans-serif";
        ctx.fillText(pass.code, W / 2, y + size + 158);

        ctx.fillStyle = 'rgba(240,240,240,0.40)';
        ctx.font = "400 22px 'Inter', system-ui, sans-serif";
        ctx.fillText(
          'Muestra este código en la entrada del evento.',
          W / 2,
          y + size + 214
        );
        ctx.fillText(this.formatDate(pass.registeredAt) || '', W / 2, y + size + 252);

        resolve(canvas.toDataURL('image/png'));
      };
      qr.onerror = () => reject(new Error('QR no disponible'));
      qr.src = qrDataUrl;
    });
  }

  private wrapCanvasText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): void {
    const words = (text || '').split(' ');
    let line = '';
    let cursorY = y;
    for (const word of words) {
      const attempt = line ? `${line} ${word}` : word;
      if (ctx.measureText(attempt).width > maxWidth && line) {
        ctx.fillText(line, x, cursorY);
        line = word;
        cursorY += lineHeight;
      } else {
        line = attempt;
      }
    }
    if (line) ctx.fillText(line, x, cursorY);
  }

  /** Comparte el evento con quien venga en camino (Web Share → copiar). */
  async shareEvent(): Promise<void> {
    const url = this.walkin.buildShareUrl(this.eventId, 'whatsapp');
    const title = this.event?.title || 'Evento en Vemo';
    const text = `Me registré para ${title}. Regístrate tú también:`;
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    try {
      if (nav.share) {
        await nav.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      this.shareFeedback = '¡Link copiado!';
      setTimeout(() => {
        this.shareFeedback = '';
        this.cdr.detectChanges();
      }, 2200);
    } catch {
      // El usuario canceló el diálogo nativo: no es un error que mostrar.
    } finally {
      this.cdr.detectChanges();
    }
  }

  /** Convierte el registro en cuenta Vemo llevando los datos ya escritos. */
  createAccount(): void {
    const attendee = this.attendee;
    this.router.navigate(['/auth'], {
      queryParams: {
        role: 'user',
        email: attendee.email || undefined,
        name: (attendee.full_name || '').trim() || undefined,
        phone: attendee.phone || undefined
      }
    });
  }

  registerAnother(): void {
    this.walkin.clearPass(this.eventId);
    this.walkin.clearDraft(this.eventId);
    this.attendee = emptyWalkinAttendee(this.attendee.source);
    this.touched = {};
    this.pass = null;
    this.passQr = '';
    this.submitError = '';
    this.notifiedCount = 0;
    this.draftRestored = false;
    this.step = 1;
    this.stage = 'form';
    this.scrollToTop();
    this.cdr.detectChanges();
  }

  discardDraft(): void {
    this.walkin.clearDraft(this.eventId);
    this.attendee = emptyWalkinAttendee(this.attendee.source);
    this.touched = {};
    this.draftRestored = false;
    this.step = 1;
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
