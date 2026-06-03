// ════════════════════════════════════════════════════════════════════
// ProfilePublicService (Fase F3): perfiles públicos de usuario y
// organizador (con stats + reviews + estado de follow para el visitante).
// Nombre "public" para no colisionar con el ProfileComponent (panel propio).
// ════════════════════════════════════════════════════════════════════
import { Injectable } from '@angular/core';
import { apiRequest, authHeaders } from './utils/api-client';
import { UserProfile, OrganizerProfile } from './models/profile.model';

@Injectable({ providedIn: 'root' })
export class ProfilePublicService {
  getUserProfile(userId: string): Promise<UserProfile> {
    return apiRequest<UserProfile>(`/api/users/${userId}/profile`, { headers: authHeaders() });
  }

  getOrganizerProfile(organizerId: string): Promise<OrganizerProfile> {
    return apiRequest<OrganizerProfile>(`/api/organizers/${organizerId}/profile`, { headers: authHeaders() });
  }
}
