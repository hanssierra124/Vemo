import { environment } from '../environments/environment';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isLogin = true;

  // Common fields
  email = '';
  password = '';
  username = '';
  role = 'user';

  // Organizer-specific fields
  whatsapp = '';
  businessType = '';

  // User-specific fields
  birthDate = '';
  phone = '';

  // Validation
  errors: { [key: string]: string } = {};
  submitting = false;

  businessTypes = [
    { value: 'bar_restaurante', label: 'Bar / Restaurante' },
    { value: 'discoteca', label: 'Discoteca / Club' },
    { value: 'centro_cultural', label: 'Centro Cultural' },
    { value: 'productora_eventos', label: 'Productora de Eventos' },
    { value: 'espacio_deportivo', label: 'Espacio Deportivo' },
    { value: 'galeria_arte', label: 'Galería de Arte' },
    { value: 'empresa_turismo', label: 'Empresa de Turismo' },
    { value: 'fundacion_ong', label: 'Fundación / ONG' },
    { value: 'emprendimiento', label: 'Emprendimiento Local' },
    { value: 'otro', label: 'Otro' }
  ];

  constructor(private router: Router) {}

  validateRegistration(): boolean {
    this.errors = {};

    if (!this.email || !this.email.includes('@')) {
      this.errors['email'] = 'Ingresa un correo válido';
    }
    if (!this.password || this.password.length < 6) {
      this.errors['password'] = 'La contraseña debe tener al menos 6 caracteres';
    }
    if (!this.username || this.username.trim().length < 2) {
      this.errors['username'] = 'Ingresa un nombre de usuario válido';
    }

    if (this.role === 'organizer') {
      if (!this.whatsapp || this.whatsapp.trim().length < 7) {
        this.errors['whatsapp'] = 'Ingresa un número de WhatsApp válido';
      }
      if (!this.businessType) {
        this.errors['businessType'] = 'Selecciona el tipo de negocio';
      }
    }

    if (this.role === 'user') {
      if (!this.birthDate) {
        this.errors['birthDate'] = 'La fecha de nacimiento es obligatoria';
      } else {
        const age = this.calculateAge(new Date(this.birthDate));
        if (age < 14) {
          this.errors['birthDate'] = 'Debes tener al menos 14 años';
        }
      }
    }

    return Object.keys(this.errors).length === 0;
  }

  calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  }

  validateLogin(): boolean {
    this.errors = {};
    if (!this.email) this.errors['email'] = 'Ingresa tu correo';
    if (!this.password) this.errors['password'] = 'Ingresa tu contraseña';
    return Object.keys(this.errors).length === 0;
  }

  async onLogin() {
    if (!this.validateLogin()) return;
    this.submitting = true;

    try {
      const res = await fetch(`${environment.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password })
      });

      const data = await res.json();

      if (data.token) {
        localStorage.setItem('vemo_token', data.token);
        this.router.navigate(['/profile']);
      } else {
        const err = (data.error || '').toLowerCase();
        if (err.includes('invalid login') || err.includes('invalid_credentials')) {
          this.errors['general'] = 'Correo o contraseña incorrectos. Verifica tus datos.';
        } else if (err.includes('email not confirmed')) {
          this.errors['general'] = 'Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.';
        } else if (err.includes('too many requests') || err.includes('rate limit')) {
          this.errors['general'] = 'Demasiados intentos. Espera un momento antes de intentar de nuevo.';
        } else {
          this.errors['general'] = data.error || 'No se pudo iniciar sesión. Verifica tus credenciales.';
        }
      }
    } catch {
      this.errors['general'] = 'No se pudo conectar con el servidor. Intenta de nuevo.';
    } finally {
      this.submitting = false;
    }
  }

  async onRegister() {
    if (!this.validateRegistration()) return;
    this.submitting = true;

    try {
      const body: any = {
        email: this.email,
        password: this.password,
        username: this.username,
        role: this.role
      };

      if (this.role === 'organizer') {
        body.whatsapp = this.whatsapp;
        body.business_type = this.businessType;
      }

      if (this.role === 'user') {
        body.birth_date = this.birthDate;
        body.phone = this.phone;
      }

      const res = await fetch(`${environment.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!data.error) {
        await this.autoLoginAfterRegister();
      } else {
        this.errors['general'] = data.error;
      }
    } catch {
      this.errors['general'] = 'El servidor no responde. Intenta de nuevo.';
    } finally {
      this.submitting = false;
    }
  }

  async autoLoginAfterRegister() {
    const res = await fetch(`${environment.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password })
    });
    const data = await res.json();

    if (data.token) {
      localStorage.setItem('vemo_token', data.token);

      if (this.role === 'organizer') {
        this.router.navigate(['/onboarding/verify']);
      } else {
        this.router.navigate(['/onboarding/interests']);
      }
    }
  }

  hasError(field: string): boolean {
    return !!this.errors[field];
  }
}
