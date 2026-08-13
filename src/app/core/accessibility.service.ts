import { Injectable, signal, effect } from '@angular/core';

export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type LightingMode = 'auto' | 'dim' | 'bright';

export interface AccessibilityPrefs {
  colorblindMode: ColorblindMode;
  physicalMode: boolean;
  lowStimulation: boolean;
  lighting: LightingMode;
}

const STORAGE_KEY = 'vemo_a11y_prefs';

const DEFAULT_PREFS: AccessibilityPrefs = {
  colorblindMode: 'none',
  physicalMode: false,
  lowStimulation: false,
  lighting: 'auto'
};

// Todas las clases que el servicio puede llegar a poner en <html>, para
// poder limpiarlas de una sola vez antes de aplicar el estado vigente.
const ALL_CLASSES = [
  'a11y-cb-protanopia', 'a11y-cb-deuteranopia', 'a11y-cb-tritanopia',
  'a11y-physical', 'a11y-low-stimulation',
  'a11y-lighting-dim', 'a11y-lighting-bright'
];

@Injectable({ providedIn: 'root' })
export class AccessibilityService {
  readonly prefs = signal<AccessibilityPrefs>(this.loadPrefs());

  constructor() {
    // Un único punto de verdad: cada cambio de señal re-pinta <html> y
    // persiste. Evita repetir esta lógica en cada setter.
    effect(() => this.applyToDocument(this.prefs()));
  }

  private loadPrefs(): AccessibilityPrefs {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_PREFS };
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_PREFS };
    }
  }

  private applyToDocument(prefs: AccessibilityPrefs) {
    const root = document.documentElement;
    root.classList.remove(...ALL_CLASSES);

    if (prefs.colorblindMode !== 'none') {
      root.classList.add(`a11y-cb-${prefs.colorblindMode}`);
    }
    if (prefs.physicalMode) root.classList.add('a11y-physical');
    if (prefs.lowStimulation) root.classList.add('a11y-low-stimulation');
    if (prefs.lighting !== 'auto') root.classList.add(`a11y-lighting-${prefs.lighting}`);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // Almacenamiento no disponible (modo privado, cuota llena): la
      // preferencia sigue activa en memoria para esta sesión.
    }
  }

  setColorblindMode(mode: ColorblindMode) {
    this.prefs.update(p => ({ ...p, colorblindMode: mode }));
  }

  setPhysicalMode(enabled: boolean) {
    this.prefs.update(p => ({ ...p, physicalMode: enabled }));
  }

  setLowStimulation(enabled: boolean) {
    this.prefs.update(p => ({ ...p, lowStimulation: enabled }));
  }

  setLighting(mode: LightingMode) {
    this.prefs.update(p => ({ ...p, lighting: mode }));
  }

  reset() {
    this.prefs.set({ ...DEFAULT_PREFS });
  }
}
