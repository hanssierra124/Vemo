// ════════════════════════════════════════════════════════════════════
// StarRatingComponent — estrellas con MEDIA precisión (0.5..5), estilo
// Letterboxd. Modo lectura (display) e interactivo (selección por mitades).
// Reutilizable en event-detail, organizador, perfil y feed (DRY).
// Identidad VEMO: relleno oro (#FFD700), base tenue.
// ════════════════════════════════════════════════════════════════════
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-star-rating',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="vstars"
         [class.readonly]="readonly"
         [style.fontSize.px]="size"
         (mouseleave)="hoverHalf = 0">
      <span class="vstar" *ngFor="let i of slots">
        <span class="vstar-bg">★</span>
        <span class="vstar-fill" [style.width.%]="fillPercent(i)">★</span>
        <ng-container *ngIf="!readonly">
          <button type="button" class="vhalf left"
                  [attr.aria-label]="(i * 2 + 1) / 2 + ' estrellas'"
                  (mouseenter)="hoverHalf = i * 2 + 1"
                  (click)="pick(i * 2 + 1)"></button>
          <button type="button" class="vhalf right"
                  [attr.aria-label]="(i * 2 + 2) / 2 + ' estrellas'"
                  (mouseenter)="hoverHalf = i * 2 + 2"
                  (click)="pick(i * 2 + 2)"></button>
        </ng-container>
      </span>
      <span class="vstars-value" *ngIf="showValue && currentHalf > 0">
        {{ currentHalf / 2 }}
      </span>
    </div>
  `,
  styles: [`
    .vstars { display: inline-flex; align-items: center; gap: 2px; line-height: 1;
      color: rgba(255,255,255,0.18); user-select: none; }
    .vstar { position: relative; display: inline-block; width: 1em; height: 1em; }
    .vstar-bg { display: block; }
    .vstar-fill { position: absolute; top: 0; left: 0; height: 100%; overflow: hidden;
      white-space: nowrap; color: #FFD700; width: 0;
      filter: drop-shadow(0 0 4px rgba(255,215,0,0.45)); transition: width .06s ease; }
    .vhalf { position: absolute; top: 0; height: 100%; width: 50%; padding: 0; margin: 0;
      background: transparent; border: 0; cursor: pointer; z-index: 2; }
    .vhalf.left { left: 0; } .vhalf.right { right: 0; }
    .vstars.readonly .vstar { cursor: default; }
    .vstars-value { margin-left: 6px; font-size: .55em; color: #FFD700; font-weight: 700; }
  `],
})
export class StarRatingComponent {
  /** Valor decimal 0..5 (pasos de 0.5). */
  @Input() value = 0;
  @Input() readonly = false;
  @Input() size = 28;
  @Input() showValue = false;
  @Output() valueChange = new EventEmitter<number>();

  readonly slots = [0, 1, 2, 3, 4];
  hoverHalf = 0; // 0..10 (preview al pasar el cursor)

  /** Mitades seleccionadas a partir del value. */
  get selectedHalf(): number {
    return Math.max(0, Math.min(10, Math.round((this.value || 0) * 2)));
  }

  /** Mitades a mostrar (hover tiene prioridad). */
  get currentHalf(): number {
    return this.hoverHalf || this.selectedHalf;
  }

  fillPercent(starIndex: number): number {
    const lo = starIndex * 2;
    const pct = ((this.currentHalf - lo) / 2) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  pick(half: number): void {
    if (this.readonly) return;
    this.value = half / 2;
    this.valueChange.emit(this.value);
  }
}
