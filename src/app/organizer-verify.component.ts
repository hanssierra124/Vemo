import { environment } from '../environments/environment';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-organizer-verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './organizer-verify.component.html',
  styleUrls: ['./organizer-verify.component.css']
})
export class OrganizerVerifyComponent {
  companyName = '';
  nit = '';
  isUploading = false;
  
  frontIdFile: File | null = null;
  backIdFile: File | null = null;

  constructor(private router: Router) {}

  onFileSelected(event: any, type: 'front' | 'back') {
    const file = event.target.files[0];
    if (file) {
      if (type === 'front') this.frontIdFile = file;
      else this.backIdFile = file;
    }
  }

  async submitVerification() {
    // 1. Validamos que todo esté completo
    if (!this.companyName || !this.frontIdFile || !this.backIdFile) {
      alert('Por favor completa el nombre y sube ambas fotos de la cédula.');
      return;
    }

    this.isUploading = true;
    const token = localStorage.getItem('vemo_token');

    try {
      // 2. Usamos FormData para enviar ARCHIVOS + TEXTO
      const formData = new FormData();
      formData.append('company_name', this.companyName);
      formData.append('nit', this.nit);
      formData.append('front', this.frontIdFile); // Archivo binario
      formData.append('back', this.backIdFile);   // Archivo binario

      // 3. Enviamos al endpoint ESPECIAL de organizadores
      const res = await fetch('${environment.apiUrl}/api/organizer/verify', {
        method: 'POST',
        headers: { 
          // IMPORTANTE: NO poner 'Content-Type': 'application/json'
          // El navegador pondrá automáticamente el multipart/form-data correcto
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        alert('¡Documentos enviados con éxito! Tu perfil está ahora en revisión.');
        this.router.navigate(['/profile']);
      } else {
        const errorData = await res.json();
        alert('Error: ' + (errorData.error || 'No se pudieron subir los documentos'));
      }
    } catch (error) {
      console.error(error);
      alert('Error de conexión con el servidor.');
    } finally {
      this.isUploading = false;
    }
  }
}