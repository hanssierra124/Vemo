import { environment } from '../environments/environment';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FavoritesService } from './favorites.service'; 

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  favEvents: any[] = [];

  constructor(
    private favService: FavoritesService,
    private router: Router,
    private cdr: ChangeDetectorRef // Añadimos esto para forzar la detección si es necesario
  ) {}

  ngOnInit() {
    // 1. Forzamos la carga desde el servidor
    this.favService.loadFavorites();

    // 2. Escuchamos los cambios del BehaviorSubject
    this.favService.favorites$.subscribe(events => {
      this.favEvents = events;
      this.cdr.detectChanges(); // Forzamos a Angular a pintar si hay cambios
    });
  }

  removeFav(event: any, e: Event) {
    e.stopPropagation(); 
    this.favService.toggleFavorite(event);
  }

  goToDetail(eventId: string) {
    this.router.navigate(['/event', eventId]);
  }
}