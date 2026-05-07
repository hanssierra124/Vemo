import { environment } from '../environments/environment';
import { Component, OnInit, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { FavoritesService } from './favorites.service';

@Component({
  selector: 'app-experiencias',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiencias.component.html',
  styleUrls: ['./experiencias.component.css']
})
export class ExperienciasComponent implements OnInit {
  experiencias: any[] = [];
  loading = true;
  activeType = 'all';
  activeCategory = '';

  typeOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'place', label: '📍 Lugares' },
  ];

  categoryOptions: string[] = [];

  get filtered(): any[] {
    let list = this.experiencias;
    if (this.activeType !== 'all') {
      list = list.filter(e => e.type === this.activeType || e.content_type === this.activeType);
    }
    if (this.activeCategory) {
      list = list.filter(e => e.category === this.activeCategory);
    }
    return list;
  }

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    public favService: FavoritesService
  ) {}

  ngOnInit() {
    this.loadExperiencias();
  }

  async loadExperiencias() {
    try {
      const res = await fetch(`${environment.apiUrl}/api/experiences`);
      if (res.ok) {
        const data = await res.json();
        this.experiencias = Array.isArray(data) ? data : (data.data || []);
        const cats = [...new Set(this.experiencias.map((e: any) => e.category).filter(Boolean))] as string[];
        this.categoryOptions = cats;
      }
    } catch {}
    finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  setType(type: string) { this.activeType = type; this.cdr.detectChanges(); }
  setCategory(cat: string) { this.activeCategory = this.activeCategory === cat ? '' : cat; this.cdr.detectChanges(); }

  goToDetail(id: string) { this.router.navigate(['/event', id]); }

  getEmotionColor(climate: any): string {
    if (!climate) return '#FF4D80';
    const parsed = typeof climate === 'string' ? JSON.parse(climate) : climate;
    const top = Object.entries(parsed).sort((a: any, b: any) => b[1] - a[1])[0];
    const map: any = { calma: '#00FFFF', euforia: '#FF4500', melancolia: '#1E90FF', caos: '#FF1493' };
    return map[(top?.[0] as string)] || '#FF4D80';
  }

  toggleLike(exp: any, e: Event) { e.stopPropagation(); this.favService.toggleFavorite(exp); }
  isFav(id: string) { return this.favService.isFavorite(id); }
}
