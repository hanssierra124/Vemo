import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreatorTypesService } from '../../../creator-types.service';
import { CreatorType } from '../../../models/creator-type.model';

// Picker de dos niveles para "Creadores de espacios": selección única de
// tipo (Espacios/Personas/Comunidades/Marcas) y selección múltiple de tags
// acotada al tipo elegido. Cambiar de tipo limpia los tags ya elegidos
// porque los tags están acotados a un solo tipo.
@Component({
  selector: 'app-creator-type-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './creator-type-picker.html',
  styleUrl: './creator-type-picker.css'
})
export class CreatorTypePicker implements OnInit {
  @Input() selectedType: string | null = null;
  @Input() selectedTags: string[] = [];
  // auth.component y organizer-verify.component son de tema claro; el
  // panel de edición de perfil (profile.component) es de tema oscuro.
  @Input() theme: 'light' | 'dark' = 'light';
  @Output() selectedTypeChange = new EventEmitter<string | null>();
  @Output() selectedTagsChange = new EventEmitter<string[]>();

  types: CreatorType[] = [];
  loading = true;

  constructor(private creatorTypes: CreatorTypesService) {}

  async ngOnInit() {
    this.types = await this.creatorTypes.getCreatorTypes();
    this.loading = false;
  }

  get currentTags() {
    return this.types.find(t => t.id === this.selectedType)?.tags || [];
  }

  chooseType(id: string) {
    const changingType = this.selectedType !== id;
    this.selectedType = id;
    this.selectedTypeChange.emit(this.selectedType);
    if (changingType) {
      this.selectedTags = [];
      this.selectedTagsChange.emit(this.selectedTags);
    }
  }

  toggleTag(id: string) {
    this.selectedTags = this.selectedTags.includes(id)
      ? this.selectedTags.filter(t => t !== id)
      : [...this.selectedTags, id];
    this.selectedTagsChange.emit(this.selectedTags);
  }

  isTagSelected(id: string): boolean {
    return this.selectedTags.includes(id);
  }
}
