import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit {
  pendingList: any[] = [];

  ngOnInit() {
    this.loadVerifications();
  }

  async loadVerifications() {
    // Nota: Aquí deberías validar que eres admin antes de llamar
    const res = await fetch(`${environment.apiUrl}/api/admin/verifications`);
    this.pendingList = await res.json();
  }

  async decide(userId: string, status: string) {
    if(!confirm(`¿Seguro que quieres marcar como ${status}?`)) return;

    await fetch(`${environment.apiUrl}/api/admin/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, status })
    });

    this.loadVerifications(); // Recargar lista
  }

  openImage(url: string) {
    window.open(url, '_blank');
  }
}