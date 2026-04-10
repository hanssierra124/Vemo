import { environment } from '../environments/environment';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-platform-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './platform-config.component.html',
  styleUrl: './platform-config.component.css'
})
export class PlatformConfigComponent implements OnInit {

  activeSection: 'ceiling' | 'onboarding' | 'criteria' | 'pitch' = 'ceiling';

  // ===== BLOCK 4: Prototype Ceiling =====
  ceilingConfig = {
    max_organizers: 30,
    max_users: 500,
    current_organizers: 0,
    current_users: 0,
    ceiling_behavior: 'waitlist',  // waitlist | close | scale
    phase: 1,
    phase_description: 'MVP Barranquilla - Validación de producto',
    operational_limit_reason: 'Capacidad de acompañamiento personalizado y QA manual de eventos',
    technical_limit_reason: 'Infraestructura en Render free/starter tier, Supabase free tier limits'
  };

  ceilingBehaviors = [
    { value: 'waitlist', label: 'Lista de espera', desc: 'Los nuevos registros quedan en espera hasta que haya cupo' },
    { value: 'close', label: 'Cerrar registro', desc: 'No se aceptan nuevos registros hasta próxima fase' },
    { value: 'scale', label: 'Escalar infraestructura', desc: 'Se amplía la capacidad automáticamente (requiere upgrade de plan)' }
  ];

  // ===== BLOCK 5: Organizer Onboarding Materials =====
  selectionCriteria = [
    { id: 'legal', label: 'Negocio legalmente constituido', description: 'Tiene NIT o cédula de representante legal', required: true },
    { id: 'category', label: 'Categoría alineada con Vemo', description: 'Ofrece experiencias culturales, gastronómicas, deportivas o de entretenimiento', required: true },
    { id: 'location', label: 'Ubicación en zona de cobertura', description: 'Opera en Barranquilla, Santa Marta o Cartagena', required: true },
    { id: 'quality', label: 'Calidad mínima de contenido', description: 'Puede proveer fotos, descripción y datos básicos de sus eventos', required: true },
    { id: 'commitment', label: 'Compromiso de uso', description: 'Se compromete a publicar al menos 1 evento/experiencia al mes', required: false },
    { id: 'reputation', label: 'Reputación verificable', description: 'Tiene presencia en redes sociales o reseñas positivas', required: false }
  ];

  pitchText = `¡Hola! Somos Vemo, la plataforma que conecta a las personas con las mejores experiencias en Barranquilla.

Estamos buscando los mejores organizadores de eventos y experiencias de la ciudad para ser parte de nuestro lanzamiento exclusivo.

¿Qué te ofrecemos?
• Visibilidad directa ante personas que buscan exactamente lo que tú ofreces
• Recomendaciones inteligentes con Vela, nuestra IA que conecta personas con experiencias según sus gustos
• Dashboard con métricas reales: vistas, guardados, compartidos y asistencia por QR
• Acompañamiento personalizado durante toda la fase de lanzamiento
• Posicionamiento como marca destacada en la plataforma

¿Qué necesitas?
• Tener un negocio o proyecto de experiencias activo en la ciudad
• Disposición para publicar al menos 1 evento o experiencia al mes
• Ganas de hacer crecer la oferta cultural de Barranquilla

El proceso es simple:
1. Te registras como organizador en vfrfrfemo.app
2. Completas tu verificación (NIT + documento de identidad)
3. Nuestro equipo revisa y aprueba tu perfil en máximo 48 horas
4. ¡Empiezas a publicar y a conectar con tu audiencia ideal!

¿Te interesa? Escríbenos y te damos todos los detalles.`;

  tutorialSteps = [
    { step: 1, title: 'Registro', description: 'Crea tu cuenta como organizador con tu NIT, email y WhatsApp. Selecciona tu tipo de negocio.', icon: '📝' },
    { step: 2, title: 'Verificación', description: 'Sube foto frontal y trasera de tu documento de identidad. Agrega tu logo y dirección.', icon: '🪪' },
    { step: 3, title: 'Espera aprobación', description: 'Nuestro equipo revisará tu información en máximo 48 horas. Te notificaremos por correo.', icon: '⏳' },
    { step: 4, title: 'Completa tu perfil', description: 'Agrega horarios de atención, categorías, teléfono público y descripción de tu negocio.', icon: '🏪' },
    { step: 5, title: 'Publica tu primer evento', description: 'Crea tu primera publicación con título, descripción, fecha, ubicación, emoción y categorías.', icon: '🎉' },
    { step: 6, title: 'Monitorea resultados', description: 'Revisa tus métricas en el Panel de Creador: vistas, guardados, compartidos y asistencia.', icon: '📊' }
  ];

  accompanimentRoute = [
    { week: 'Semana 1', title: 'Onboarding', tasks: ['Reunión de bienvenida (15 min)', 'Ayuda con registro y verificación', 'Revisión de primer evento borrador'] },
    { week: 'Semana 2', title: 'Primera publicación', tasks: ['Revisión y aprobación de evento', 'Tips de fotografía y descripción', 'Activación de perfil público'] },
    { week: 'Semana 3-4', title: 'Seguimiento', tasks: ['Revisión de métricas iniciales', 'Ajustes de perfil según feedback', 'Planificación de segundo evento'] },
    { week: 'Mes 2+', title: 'Autonomía', tasks: ['Check-in mensual (10 min)', 'Soporte reactivo por WhatsApp', 'Acceso a nuevas funcionalidades'] }
  ];

  loading = false;
  saveSuccess = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadCurrentStats();
  }

  async loadCurrentStats() {
    try {
      const token = localStorage.getItem('vemo_token');
      const res = await fetch(`${environment.apiUrl}/api/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.ceilingConfig.current_organizers = data.total_organizers || 0;
        this.ceilingConfig.current_users = data.total_users || 0;
      }
    } catch {}
  }

  getUsagePercent(current: number, max: number): number {
    return Math.min(Math.round((current / max) * 100), 100);
  }

  getUsageColor(percent: number): string {
    if (percent >= 90) return '#FF4D4D';
    if (percent >= 70) return '#FFC107';
    return '#00FF94';
  }

  async saveCeilingConfig() {
    this.loading = true;
    try {
      const token = localStorage.getItem('vemo_token');
      const res = await fetch(`${environment.apiUrl}/api/admin/platform-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          max_organizers: this.ceilingConfig.max_organizers,
          max_users: this.ceilingConfig.max_users,
          ceiling_behavior: this.ceilingConfig.ceiling_behavior,
          phase: this.ceilingConfig.phase
        })
      });
      if (res.ok) {
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      } else {
        alert('Error al guardar configuración');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      this.loading = false;
    }
  }

  copyPitch() {
    navigator.clipboard.writeText(this.pitchText).then(() => {
      alert('Texto copiado al portapapeles');
    });
  }

  goBack() {
    this.router.navigate(['/profile']);
  }
}
