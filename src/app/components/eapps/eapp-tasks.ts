import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface StoreTask {
  id: string;
  title: string;
  sector: string;
  completed: boolean;
  time: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-tasks',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#140b06] text-stone-200 font-mono select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER TAREFAS -->
      <div class="flex items-center justify-between gap-3 bg-[#1c0d06] p-3 rounded-2xl border border-[#381c0c] shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-500 flex items-center justify-center">
            <mat-icon class="text-xl">task_alt</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-serif font-black text-white">Tarefas Operacionais</h2>
            <p class="text-[10px] text-stone-400">Checklist diário de abertura, manipulação e encerramento.</p>
          </div>
        </div>

        <span class="px-2.5 py-1 rounded-xl bg-[#261207] text-amber-400 text-xs font-bold border border-[#482814]">
          {{ completedCount() }} / {{ tasks().length }} Concluídas
        </span>
      </div>

      <!-- LISTA DE TAREFAS -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-2">
        @for (task of tasks(); track task.id) {
          <button
            type="button"
            (click)="toggleTask(task.id)"
            [class]="task.completed ? 'bg-[#180b04]/60 border-[#2a1307] opacity-60' : 'bg-[#1c0d06] border-[#381c0c]'"
            class="w-full text-left p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer hover:border-amber-600/60 transition-all">
            <div class="flex items-center gap-2.5">
              <mat-icon [class]="task.completed ? 'text-emerald-400' : 'text-stone-600'" class="text-lg">
                {{ task.completed ? 'check_box' : 'check_box_outline_blank' }}
              </mat-icon>
              <div>
                <span [class]="task.completed ? 'line-through text-stone-500' : 'text-white font-bold'" class="text-xs block">
                  {{ task.title }}
                </span>
                <span class="text-[9px] text-amber-500/80 uppercase">{{ task.sector }} • Horário: {{ task.time }}</span>
              </div>
            </div>
          </button>
        }
      </div>

    </div>
  `
})
export class EAppTasksWindow {
  readonly tasks = signal<StoreTask[]>([
    { id: '1', title: 'Conferência de Fundo de Troco do Caixa', sector: 'Frente de Caixa', completed: true, time: '09:00' },
    { id: '2', title: 'Aferição de Temperatura dos Refrigeradores', sector: 'Cozinha', completed: true, time: '09:30' },
    { id: '3', title: 'Higienização e Montagem das Mesas do Salão', sector: 'Salão', completed: false, time: '10:00' },
    { id: '4', title: 'Conferência de Bobinas Térmicas nos Terminais', sector: 'Frente de Caixa', completed: false, time: '11:00' },
    { id: '5', title: 'Recebimento de Mercadorias de Hortifrúti', sector: 'Estoque', completed: false, time: '14:00' },
    { id: '6', title: 'Fechamento de Caixa e Redução Z', sector: 'Tesouraria', completed: false, time: '23:00' }
  ]);

  completedCount() {
    return this.tasks().filter(t => t.completed).length;
  }

  toggleTask(id: string) {
    this.tasks.update(ts => ts.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  }
}
