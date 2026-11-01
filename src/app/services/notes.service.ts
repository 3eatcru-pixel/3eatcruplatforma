import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MemoNote } from '../models/ecosystem.model';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotesService {
  private readonly http = inject(HttpClient);
  
  readonly notes = signal<MemoNote[]>([]);

  async fetchNotes(): Promise<MemoNote[]> {
    const data = await firstValueFrom(this.http.get<MemoNote[]>('/api/notes'));
    this.notes.set(data);
    return data;
  }

  async addNote(note: Partial<MemoNote>): Promise<MemoNote> {
    const data = await firstValueFrom(this.http.post<MemoNote>('/api/notes', note));
    this.notes.update(cur => [data, ...cur]);
    return data;
  }

  async deleteNote(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/notes/${id}`));
    this.notes.update(cur => cur.filter(n => n.id !== id));
  }
}
