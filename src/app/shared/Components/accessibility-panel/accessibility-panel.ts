import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AccessibilityService,
  ColorblindMode,
  LightingMode
} from '../../../core/accessibility.service';

@Component({
  selector: 'app-accessibility-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './accessibility-panel.html',
  styleUrl: './accessibility-panel.css'
})
export class AccessibilityPanel {
  readonly open = signal(false);
  readonly colorblindOptions: { value: ColorblindMode; label: string }[] = [
    { value: 'none', label: 'Ninguno' },
    { value: 'protanopia', label: 'Protanopia (rojo)' },
    { value: 'deuteranopia', label: 'Deuteranopia (verde)' },
    { value: 'tritanopia', label: 'Tritanopia (azul)' }
  ];
  readonly lightingOptions: { value: LightingMode; label: string }[] = [
    { value: 'auto', label: 'Automática' },
    { value: 'dim', label: 'Tenue' },
    { value: 'bright', label: 'Brillante' }
  ];

  constructor(readonly a11y: AccessibilityService) {}

  toggle() {
    this.open.update(v => !v);
  }

  close() {
    this.open.set(false);
  }
}
