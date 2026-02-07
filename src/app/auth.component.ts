import { environment } from '../environments/environment';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <--- INDISPENSABLE
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.css'
})
export class AuthComponent {
  isLogin = true; // Empieza en Login
  
  // Variables conectadas al HTML
  email = '';
  password = '';
  username = '';
  role = 'user'; 

  constructor(private router: Router) {}

  // --- LOGICA DE LOGIN ---
  async onLogin() {
    console.log("Intentando Login con:", this.email); // CHISMOSO 1
    
    try {
      const res = await fetch('${environment.apiUrl}/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: this.email, password: this.password })
      });
      
      const data = await res.json();
      console.log("Respuesta Login:", data); // CHISMOSO 2

      if (data.token) {
        localStorage.setItem('vemo_token', data.token);
        this.router.navigate(['/profile']);
      } else {
        alert('Error Login: ' + (data.error || 'Revisa tus datos'));
      }
    } catch (error) {
      console.error("Error de red:", error);
      alert('No se pudo conectar con el servidor.');
    }
  }

  // --- LOGICA DE REGISTRO ---
  async onRegister() {
    console.log("Click en Crear Cuenta!"); // CHISMOSO 3
    console.log("Datos a enviar:", { 
      email: this.email, 
      user: this.username, 
      role: this.role 
    });

    // Validación básica antes de enviar
    if (!this.email || !this.password || !this.username) {
      alert('Por favor llena todos los campos');
      return;
    }

    try {
      const res = await fetch('${environment.apiUrl}/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: this.email, 
          password: this.password, 
          username: this.username,
          role: this.role 
        })
      });

      const data = await res.json();
      console.log("Respuesta Registro:", data); // CHISMOSO 4
      
      if (!data.error) {
        // Si el registro funciona, hacemos Login automático
        alert('¡Cuenta creada! Redirigiendo...');
        await this.autoLoginAfterRegister();
      } else {
        alert('Error Registro: ' + data.error);
      }
    } catch (error) {
      console.error("Error de red en Registro:", error);
      alert('El servidor no responde. ¿Está prendido (node server.js)?');
    }
  }

  async autoLoginAfterRegister() {
    // Reutilizamos la lógica de login
    const res = await fetch('${environment.apiUrl}/api/auth/login', {
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
}