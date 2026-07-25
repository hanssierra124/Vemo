import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { CreatorType } from './models/creator-type.model';

// Catálogo de "Creadores de espacios": tipo (Espacios/Personas/Comunidades/
// Marcas) + tags propios de cada tipo. Se pide una sola vez y se comparte
// entre signup, "construir perfil", edición de perfil y el perfil público.
@Injectable({ providedIn: 'root' })
export class CreatorTypesService {
  private cache: CreatorType[] | null = null;
  private pending: Promise<CreatorType[]> | null = null;

  async getCreatorTypes(): Promise<CreatorType[]> {
    if (this.cache) return this.cache;
    if (this.pending) return this.pending;

    this.pending = fetch(`${environment.apiUrl}/api/creator-types`)
      .then(res => (res.ok ? res.json() : []))
      .then((data: CreatorType[]) => {
        this.cache = data;
        return data;
      })
      .catch(() => [])
      .finally(() => { this.pending = null; });

    return this.pending;
  }

  tagLabel(types: CreatorType[], typeId: string | null | undefined, tagId: string): string {
    const type = types.find(t => t.id === typeId);
    return type?.tags.find(t => t.id === tagId)?.name || tagId;
  }

  typeLabel(types: CreatorType[], typeId: string | null | undefined): string {
    return types.find(t => t.id === typeId)?.name || typeId || '';
  }
}
