import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-event.component.html',
  styleUrls: ['./create-event.component.css']
})
export class CreateEventComponent implements OnInit {
  // Datos del formulario (Incluimos main_emotion_id)
  eventData = { 
    title: '', 
    description: '', 
    date_event: '', 
    location_name: '',
    main_emotion_id: '' 
  };
  
  availableCategories: any[] = [];
  availableEmotions: any[] = []; // Nueva lista de emociones
  selectedCategories: string[] = [];
  selectedFile: File | null = null;
  
  // Control de estado
  loading = false;
  isEditMode = false;
  eventId: string | null = null;
  currentImageUrl: string | null = null;

  constructor(
    private router: Router, 
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadEmotions(); // Cargamos la brújula emocional
    
    this.eventId = this.route.snapshot.paramMap.get('id');
    
    if (this.eventId) {
      this.isEditMode = true;
      this.fetchEventDetails(this.eventId);
    }
  }

  async loadCategories() {
    const res = await fetch('${environment.apiUrl}/api/categories');
    if (res.ok) this.availableCategories = await res.json();
  }

  async loadEmotions() {
    const res = await fetch('${environment.apiUrl}/api/emotions');
    if (res.ok) this.availableEmotions = await res.json();
  }

  async fetchEventDetails(id: string) {
    try {
      const res = await fetch(`${environment.apiUrl}/api/events/${id}`);
      if (res.ok) {
        const data = await res.json();
        
        this.eventData = {
          title: data.title,
          description: data.description,
          date_event: new Date(data.date_event).toISOString().slice(0, 16),
          location_name: data.location_name,
          main_emotion_id: data.main_emotion_id // Cargamos la emoción guardada
        };
        
        this.selectedCategories = data.categoryIds || [];
        this.currentImageUrl = data.image_url;
      }
    } catch (err) {
      console.error("Error cargando detalles del evento:", err);
    }
  }

  toggleCategory(id: string) {
    if (this.selectedCategories.includes(id)) {
      this.selectedCategories = this.selectedCategories.filter(c => c !== id);
    } else {
      this.selectedCategories.push(id);
    }
  }

  isSelected(id: string) { return this.selectedCategories.includes(id); }

  onFileSelected(event: any) { this.selectedFile = event.target.files[0]; }

async onSubmit() {
    this.loading = true;
    const formData = new FormData();
    
    // Agregamos los datos del evento
    Object.keys(this.eventData).forEach(key => formData.append(key, (this.eventData as any)[key]));
    formData.append('categoryIds', JSON.stringify(this.selectedCategories));
    
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    try {
      const url = this.isEditMode 
        ? `${environment.apiUrl}/api/events/update/${this.eventId}` 
        : '${environment.apiUrl}/api/events/create';
      
      const method = this.isEditMode ? 'PUT' : 'POST';

      // --- DETECTAR EL TOKEN CORRECTO ---
      // Buscamos las dos opciones posibles para evitar el error de sesión expirada
      const token = localStorage.getItem('token') || localStorage.getItem('vemo_token'); 

      if (!token) {
        console.error("❌ No se encontró ningún token en LocalStorage");
        alert("Tu sesión no es válida. Por favor, inicia sesión de nuevo.");
        this.router.navigate(['/auth']);
        return;
      }

      const res = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}` // Formato estándar que espera tu server.js
        },
        body: formData
      });

      if (res.ok) {
        alert(this.isEditMode ? "✅ Evento actualizado con éxito" : "✅ Evento enviado a revisión");
        this.router.navigate(['/profile']);
      } else {
        const errorData = await res.json();
        // Si el servidor responde 401, el token es inválido o expiró de verdad
        if (res.status === 401) {
          alert("Error de seguridad: " + errorData.error);
          this.router.navigate(['/auth']);
        } else {
          alert("Error: " + (errorData.error || "Fallo al procesar."));
        }
      }
    } catch (err) {
      console.error("❌ Error de red:", err);
    } finally {
      this.loading = false;
    }
  }
}