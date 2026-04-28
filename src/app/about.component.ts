import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface TeamMember {
  name: string;
  role: string;
  photo: string;     // ruta dentro de /assets/team/ — reemplazar con la foto real
  initials: string;  // fallback visual si la foto aún no existe
  bio: string;
}

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css']
})
export class AboutComponent {
  readonly team: TeamMember[] = [
    {
      name: 'Javier Archila',
      role: 'CEO',
      photo: 'assets/team/javier.jpg',
      initials: 'JA',
      bio: 'Lidera la visión y dirección estratégica de Vemo. Conecta el producto con la cultura de la ciudad.',
    },
    {
      name: 'Byron Reales',
      role: 'CPO',
      photo: 'assets/team/byron.jpg',
      initials: 'BR',
      bio: 'Diseña la experiencia y curaduría de Vemo. Hace que cada plan se sienta hecho a tu medida.',
    },
    {
      name: 'Hans Sierra',
      role: 'CTO',
      photo: 'assets/team/hans.jpg',
      initials: 'HS',
      bio: 'Construye la tecnología detrás de Vemo. Mantiene la plataforma rápida, estable y escalable.',
    },
  ];

  /**
   * Si la foto aún no fue subida (404), ocultamos la <img> para que
   * quede visible el círculo con iniciales como fallback elegante.
   */
  onPhotoError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
