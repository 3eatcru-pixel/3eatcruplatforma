import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SocialMessage } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommunicationsService {
  private readonly http = inject(HttpClient);
  
  readonly socialMessages = signal<SocialMessage[]>([]);

  async fetchMessages(): Promise<SocialMessage[]> {
    const data = await firstValueFrom(this.http.get<SocialMessage[]>('/api/hq/communications/messages'));
    this.socialMessages.set(data);
    return data;
  }

  async sendMessage(message: Partial<SocialMessage>): Promise<SocialMessage> {
    const data = await firstValueFrom(this.http.post<SocialMessage>('/api/hq/communications/messages', message));
    this.socialMessages.update(cur => [data, ...cur]);
    return data;
  }
}
