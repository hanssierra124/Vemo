import { environment } from '../environments/environment';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-interests',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-interests.component.html',
  styleUrl: './user-interests.component.css'
})
export class UserInterestsComponent {
  interesesDisponibles = [
    { id: 'musica', nombre: 'Música en vivo', seleccionado: false },
    { id: 'gastronomia', nombre: 'Gastronomía', seleccionado: false },
    { id: 'arte', nombre: 'Arte y Cultura', seleccionado: false },
    { id: 'deportes', nombre: 'Deportes', seleccionado: false },
    { id: 'fiesta', nombre: 'Fiesta y Rumba', seleccionado: false },
    { id: 'aire_libre', nombre: 'Aire Libre', seleccionado: false }
  ];

  loading = false;

  constructor(private router: Router) {}

  toggleInteres(interes: any) {
    interes.seleccionado = !interes.seleccionado;
  }

  async guardarIntereses() {
    const seleccionados = this.interesesDisponibles
      .filter(i => i.seleccionado)
      .map(i => i.id);

    if (seleccionados.length === 0) {
      alert("Por favor selecciona al menos un gusto.");
      return;
    }

    this.loading = true; // Empieza a mostrar "Sincronizando..."
    const token = localStorage.getItem('vemo_token');

    try {
      const res = await fetch('${environment.apiUrl}/api/auth/update-profile', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ interests: seleccionados })
      });

      const data = await res.json();

      if (res.ok) {
        console.log("✅ Intereses guardados!");
        this.router.navigate(['/']); // Te manda al mapa
      } else {
        alert("Hubo un error: " + (data.error || "No se pudieron guardar los gustos"));
        this.loading = false; // Desbloquea el botón si hay error
      }
    } catch (error) {
      console.error("❌ Fallo de red:", error);
      alert("No se pudo conectar con el servidor.");
      this.loading = false; // Desbloquea el botón en fallo total
    }
  }
}