import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MoodService } from '../../../mood.service';
import { Emotion } from '../../../models/emotion.model';

@Component({
  selector: 'app-mood-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mood-confirm-modal.html',
  styleUrl: './mood-confirm-modal.css'
})
export class MoodConfirmModal implements OnInit {
  @Input({ required: true }) eventId!: string;
  @Output() confirmed = new EventEmitter<Emotion>();
  @Output() closed = new EventEmitter<void>();

  emotions: Emotion[] = [];
  loading = true;
  busy = false;
  error: string | null = null;

  constructor(private mood: MoodService) {}

  async ngOnInit() {
    this.emotions = await this.mood.getEmotions();
    this.loading = false;
  }

  async choose(emotion: Emotion) {
    if (this.busy) return;
    this.busy = true;
    this.error = null;
    try {
      await this.mood.confirmMood(this.eventId, emotion.id);
      this.confirmed.emit(emotion);
    } catch (e: any) {
      this.error = e?.message || 'No se pudo confirmar el ambiente.';
    } finally {
      this.busy = false;
    }
  }

  close() {
    this.closed.emit();
  }
}
