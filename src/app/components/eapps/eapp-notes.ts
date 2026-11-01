import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MemoNote } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-notes',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER NOTAS -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <mat-icon class="text-xl">description</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Notas • Protótipo local</h2>
            <p class="text-[10px] text-stone-400">Notas de exemplo em memória; não são compartilhadas nem salvas no servidor.</p>
          </div>
        </div>

        <button
          type="button"
          (click)="addDemoNote()"
          class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs uppercase rounded-xl cursor-pointer shadow flex items-center gap-1">
          <mat-icon class="text-sm">add</mat-icon>
          <span>Adicionar exemplo</span>
        </button>
      </div>

      <!-- GRID DE NOTAS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        @for (note of demoNotes(); track note.id) {
          <div class="bg-[#24140a] border border-amber-600/30 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-md relative group">
            <div class="space-y-1">
              <div class="flex justify-between items-start">
                <strong class="text-xs text-amber-300 font-bold block">{{ note.title }}</strong>
                <button
                  type="button"
                  (click)="deleteDemoNote(note.id)"
                  class="text-stone-500 hover:text-rose-400 cursor-pointer transition-colors">
                  <mat-icon class="text-sm">delete</mat-icon>
                </button>
              </div>
              <p class="text-xs text-stone-300 whitespace-pre-wrap leading-relaxed">{{ note.content }}</p>
            </div>

            <div class="text-[9px] text-stone-500 border-t border-[#381c0c] pt-2 font-mono">
              {{ note.updatedAt || note.createdAt }}
            </div>
          </div>
        }
      </div>

    </div>
  `
})
export class EAppNotesWindow {
  readonly demoNotes = signal<MemoNote[]>([]);

  addDemoNote() {
    const number = this.demoNotes().length + 1;
    const now = new Date().toISOString();
    this.demoNotes.update((notes) => [...notes, {
      id: `demo-note-${number}`,
      title: `Nota de demonstração ${number}`,
      content: 'Exemplo local. Não contém recado operacional real.',
      createdAt: now,
      updatedAt: now
    }]);
  }

  deleteDemoNote(id: string) {
    this.demoNotes.update((notes) => notes.filter((note) => note.id !== id));
  }
}
