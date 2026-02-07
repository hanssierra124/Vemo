import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  pendingVerifications: any[] = [];
  loading = true;

  async ngOnInit() {
    await this.loadVerifications();
  }

  async loadVerifications() {
    try {
      const res = await fetch('${environment.apiUrl}/api/admin/verifications');
      this.pendingVerifications = await res.json();
    } catch (error) {
      console.error("Error cargando veríficaciones:", error);
    } finally {
      this.loading = false;
    }
  }

async processDecision(userId: string, status: string) {
  let reason = null;
  
  if (status === 'rejected') {
    reason = prompt('Razón del rechazo definitivo:');
    if (!reason) return;
  } else if (status === 'action_required') {
    reason = prompt('¿Qué debe corregir el organizador? (Ej: Foto borrosa):');
    if (!reason) return;
  }
  
  try {
    const res = await fetch('${environment.apiUrl}/api/admin/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status, reason })
    });

    if (res.ok) {
      alert('Acción realizada con éxito');
      // Limpiamos de la lista local para que desaparezca la tarjeta
      this.pendingVerifications = this.pendingVerifications.filter(v => v.id !== userId);
    }
  } catch (error) {
    alert('Error al conectar con el servidor');
  }
} 
}