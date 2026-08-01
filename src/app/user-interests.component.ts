import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  INTERESES_DISPONIBLES, NEGATIVOS_DISPONIBLES, COMPANY_OPTIONS, TIME_OPTIONS,
  BARRIOS_DISPONIBLES, OUTING_FREQUENCY_OPTIONS, SPONTANEITY_OPTIONS,
} from './shared/user-preferences-options';

@Component({
  selector: 'app-user-interests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-interests.component.html',
  styleUrl: './user-interests.component.css'
})
export class UserInterestsComponent implements OnInit {

  // Step control
  currentStep = 1;
  totalSteps = 5;

  // Step 1: Positive interests (copia local mutable — no compartimos referencias
  // con el vocabulario importado, porque cada chip lleva su propio `seleccionado`).
  interesesDisponibles = INTERESES_DISPONIBLES.map(o => ({ id: o.value, nombre: o.label, emoji: o.emoji, seleccionado: false }));

  // Step 2: Negative preferences
  negativosDisponibles = NEGATIVOS_DISPONIBLES.map(o => ({ id: o.value, nombre: o.label, emoji: o.emoji, seleccionado: false }));

  // Step 3: Preferences (company & time)
  companyOptions = COMPANY_OPTIONS;
  timeOptions = TIME_OPTIONS;

  selectedCompany = '';
  selectedTime = '';

  // Step 4: Barrio + hábitos de salida
  barriosDisponibles = BARRIOS_DISPONIBLES;
  outingFrequencyOptions = OUTING_FREQUENCY_OPTIONS;
  spontaneityOptions = SPONTANEITY_OPTIONS;

  selectedBarrio = '';
  selectedOutingFrequency = '';
  selectedSpontaneity = '';

  // Step 5: Location permission + open feedback
  locationGranted = false;
  locationDenied = false;
  missingInCity = '';

  loading = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Check if location was already granted
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        this.locationGranted = result.state === 'granted';
        this.locationDenied = result.state === 'denied';
      }).catch(() => {});
    }
  }

  toggleInteres(interes: any) {
    interes.seleccionado = !interes.seleccionado;
  }

  get positiveCount(): number {
    return this.interesesDisponibles.filter(i => i.seleccionado).length;
  }

  get negativeCount(): number {
    return this.negativosDisponibles.filter(i => i.seleccionado).length;
  }

  canAdvance(): boolean {
    switch (this.currentStep) {
      case 1: return this.positiveCount >= 1;
      case 2: return true; // negatives are optional
      case 3: return true; // preferences are optional
      case 4: return true; // barrio/hábitos son opcionales
      case 5: return true;
      default: return true;
    }
  }

  clearBarrio(): void {
    this.selectedBarrio = '';
  }

  nextStep() {
    if (this.currentStep < this.totalSteps && this.canAdvance()) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  requestLocation() {
    if (!navigator.geolocation) {
      this.locationDenied = true;
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        this.locationGranted = true;
        this.locationDenied = false;
      },
      () => {
        this.locationDenied = true;
        this.locationGranted = false;
      }
    );
  }

  async guardarIntereses() {
    const positivos = this.interesesDisponibles
      .filter(i => i.seleccionado)
      .map(i => i.id);

    if (positivos.length === 0) {
      this.currentStep = 1;
      return;
    }

    const negativos = this.negativosDisponibles
      .filter(i => i.seleccionado)
      .map(i => i.id);

    this.loading = true;
    const token = localStorage.getItem('vemo_token');

    const payload: any = {
      interests: positivos,
      negative_preferences: negativos,
      preferred_company: this.selectedCompany || null,
      preferred_time: this.selectedTime || null,
      neighborhood: this.selectedBarrio || null,
      outing_frequency: this.selectedOutingFrequency || null,
      spontaneity: this.selectedSpontaneity || null,
      location_permission: this.locationGranted,
      missing_in_city: this.missingInCity.trim() || null
    };

    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        this.router.navigate(['/']);
      } else {
        alert('Hubo un error: ' + (data.error || 'No se pudieron guardar las preferencias'));
        this.loading = false;
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('No se pudo conectar con el servidor.');
      this.loading = false;
    }
  }
}
