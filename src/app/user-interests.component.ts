import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
  totalSteps = 4;

  // Step 1: Positive interests
  interesesDisponibles = [
    { id: 'musica', nombre: 'Música en vivo', emoji: '🎵', seleccionado: false },
    { id: 'gastronomia', nombre: 'Gastronomía', emoji: '🍽️', seleccionado: false },
    { id: 'arte', nombre: 'Arte y Cultura', emoji: '🎨', seleccionado: false },
    { id: 'deportes', nombre: 'Deportes', emoji: '⚽', seleccionado: false },
    { id: 'fiesta', nombre: 'Fiesta y Rumba', emoji: '🎉', seleccionado: false },
    { id: 'aire_libre', nombre: 'Aire Libre', emoji: '🌿', seleccionado: false },
    { id: 'teatro', nombre: 'Teatro y Shows', emoji: '🎭', seleccionado: false },
    { id: 'bienestar', nombre: 'Bienestar y Yoga', emoji: '🧘', seleccionado: false },
    { id: 'tecnologia', nombre: 'Tecnología', emoji: '💻', seleccionado: false },
    { id: 'fotografia', nombre: 'Fotografía', emoji: '📸', seleccionado: false },
    { id: 'turismo', nombre: 'Turismo local', emoji: '🗺️', seleccionado: false },
    { id: 'educacion', nombre: 'Talleres y Cursos', emoji: '📚', seleccionado: false }
  ];

  // Step 2: Negative preferences
  negativosDisponibles = [
    { id: 'multitudes', nombre: 'Multitudes grandes', emoji: '👥', seleccionado: false },
    { id: 'ruido', nombre: 'Mucho ruido', emoji: '🔊', seleccionado: false },
    { id: 'alcohol', nombre: 'Ambientes con alcohol', emoji: '🍺', seleccionado: false },
    { id: 'sol_extremo', nombre: 'Sol extremo', emoji: '☀️', seleccionado: false },
    { id: 'noche', nombre: 'Actividades nocturnas', emoji: '🌙', seleccionado: false },
    { id: 'espacios_cerrados', nombre: 'Espacios cerrados', emoji: '🏢', seleccionado: false },
    { id: 'precios_altos', nombre: 'Precios altos', emoji: '💸', seleccionado: false },
    { id: 'largo_duracion', nombre: 'Eventos muy largos', emoji: '⏳', seleccionado: false }
  ];

  // Step 3: Preferences (company & time)
  companyOptions = [
    { value: 'solo', label: 'Solo/a', emoji: '🧍' },
    { value: 'pareja', label: 'En pareja', emoji: '💑' },
    { value: 'amigos', label: 'Con amigos', emoji: '👫' },
    { value: 'familia', label: 'En familia', emoji: '👨‍👩‍👧' },
    { value: 'cualquiera', label: 'Cualquiera', emoji: '🤷' }
  ];

  timeOptions = [
    { value: 'manana', label: 'Mañana', emoji: '🌅' },
    { value: 'tarde', label: 'Tarde', emoji: '☀️' },
    { value: 'noche', label: 'Noche', emoji: '🌙' },
    { value: 'todo_dia', label: 'Cualquier hora', emoji: '🕐' }
  ];

  selectedCompany = '';
  selectedTime = '';

  // Step 4: Location permission + open feedback
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
      case 4: return true;
      default: return true;
    }
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
