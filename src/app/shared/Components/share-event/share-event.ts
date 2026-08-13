// ════════════════════════════════════════════════════════════════════
// ShareEventComponent — copiar link, compartir nativo (móvil) y QR.
// Reutilizable en cualquier página que necesite facilitar el reenvío
// de un link (evento público, evento privado, panel del organizador).
// ════════════════════════════════════════════════════════════════════
import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-share-event',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vshare" [class.vshare--light]="theme === 'light'">
      <div class="vshare-row">
        <button type="button" class="vshare-btn" (click)="copyLink()">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          {{ copied ? '¡Copiado!' : 'Copiar link' }}
        </button>
        <button type="button" class="vshare-btn" *ngIf="canNativeShare" (click)="nativeShare()">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"></line><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"></line></svg>
          Compartir
        </button>
        <button type="button" class="vshare-btn" (click)="toggleQr()">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect><line x1="14" y1="14" x2="14" y2="21"></line><line x1="21" y1="14" x2="21" y2="21"></line><line x1="14" y1="17.5" x2="21" y2="17.5"></line></svg>
          {{ showQr ? 'Ocultar QR' : 'Mostrar QR' }}
        </button>
      </div>

      <div class="vshare-qr" *ngIf="showQr">
        <p *ngIf="qrBusy" class="vshare-qr-loading">Generando QR…</p>
        <p *ngIf="qrError" class="vshare-qr-error">{{ qrError }}</p>
        <ng-container *ngIf="qrDataUrl">
          <img [src]="qrDataUrl" alt="Código QR para compartir este evento" class="vshare-qr-img" />
          <a [href]="qrDataUrl" [download]="downloadName" class="vshare-qr-download">Descargar QR</a>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .vshare { width: 100%; }
    .vshare-row { display: flex; flex-wrap: wrap; gap: 10px; }
    .vshare-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
      color: #fff; padding: 10px 18px; border-radius: 100px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: transform .15s ease, border-color .2s, background .2s;
      flex: 1 1 auto; justify-content: center; min-width: 130px;
    }
    .vshare-btn:hover { border-color: #FF4D80; background: rgba(255,77,128,0.12); transform: translateY(-2px); }
    .vshare-qr {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);
    }
    .vshare-qr-img { width: 200px; height: 200px; max-width: 100%; border-radius: 14px; background: #fff; padding: 10px; }
    .vshare-qr-download {
      font-size: 12px; color: #FFD700; text-decoration: none; font-weight: 600;
    }
    .vshare-qr-download:hover { text-decoration: underline; }
    .vshare-qr-loading, .vshare-qr-error { font-size: 13px; color: rgba(255,255,255,0.6); margin: 0; }
    .vshare-qr-error { color: #ff8a9b; }
    @media (max-width: 420px) {
      .vshare-btn { min-width: 100%; }
    }

    /* Variante clara, para paneles con fondo blanco/gris claro */
    .vshare--light .vshare-btn {
      background: #fff; border-color: #d2d2d7; color: #1d1d1f;
    }
    .vshare--light .vshare-btn:hover { border-color: #0071e3; background: #f0f7ff; }
    .vshare--light .vshare-qr { border-top-color: #d2d2d7; }
    .vshare--light .vshare-qr-download { color: #0071e3; }
    .vshare--light .vshare-qr-loading { color: #515154; }
  `],
})
export class ShareEventComponent implements OnChanges, OnDestroy {
  /** URL completa a compartir. */
  @Input() url = '';
  /** Título del evento, usado en el share nativo y el nombre del archivo QR. */
  @Input() title = 'Vemo';
  /** Paleta del host: 'dark' (default, fondos oscuros) o 'light' (paneles claros). */
  @Input() theme: 'dark' | 'light' = 'dark';

  copied = false;
  showQr = false;
  qrBusy = false;
  qrError: string | null = null;
  qrDataUrl: string | null = null;

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  get canNativeShare(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).share;
  }

  get downloadName(): string {
    const slug = (this.title || 'evento')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    return `vemo-qr-${slug || 'evento'}.png`;
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia la url (ej. el componente se reutiliza para otro evento),
    // invalidamos el QR ya generado para que no muestre el link viejo.
    if (changes['url'] && !changes['url'].firstChange) {
      this.qrDataUrl = null;
      this.showQr = false;
      this.qrError = null;
    }
  }

  ngOnDestroy(): void {
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
  }

  async copyLink(): Promise<void> {
    if (!this.url) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(this.url);
      } else {
        this.legacyCopy();
      }
    } catch {
      this.legacyCopy();
    }
    this.copied = true;
    this.cdr.detectChanges();
    if (this.copiedTimer) clearTimeout(this.copiedTimer);
    this.copiedTimer = setTimeout(() => {
      this.copied = false;
      this.cdr.detectChanges();
    }, 1800);
  }

  private legacyCopy(): void {
    if (typeof document === 'undefined') return;
    const ta = document.createElement('textarea');
    ta.value = this.url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* último recurso: no bloqueamos la UI */ }
    document.body.removeChild(ta);
  }

  async nativeShare(): Promise<void> {
    if (!this.canNativeShare || !this.url) return;
    try {
      await (navigator as any).share({ title: this.title, url: this.url });
    } catch {
      // El usuario canceló el share o el navegador lo rechazó: no es un error a mostrar.
    }
  }

  async toggleQr(): Promise<void> {
    this.showQr = !this.showQr;
    this.cdr.detectChanges();
    if (this.showQr && !this.qrDataUrl && !this.qrBusy) {
      await this.generateQr();
    }
  }

  private async generateQr(): Promise<void> {
    if (!this.url) return;
    this.qrBusy = true;
    this.qrError = null;
    this.cdr.detectChanges();
    try {
      const QRCode = (await import('qrcode')).default;
      this.qrDataUrl = await QRCode.toDataURL(this.url, { width: 240, margin: 2 });
    } catch {
      this.qrError = 'No se pudo generar el código QR.';
    } finally {
      this.qrBusy = false;
      this.cdr.detectChanges();
    }
  }
}
