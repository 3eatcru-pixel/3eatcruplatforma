import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-notification-toast',
  imports: [CommonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notification(); as notif) {
      <div class="fixed bottom-6 right-6 z-[9999] max-w-md animate-in slide-in-from-bottom-5 duration-300">
        <div
          class="flex items-center gap-3 p-4 rounded-2xl shadow-2xl backdrop-blur-md border text-xs font-semibold text-white transition-all"
          [class.bg-emerald-950/95]="notif.type === 'success'"
          [class.border-emerald-500/40]="notif.type === 'success'"
          [class.bg-sky-950/95]="notif.type === 'info'"
          [class.border-sky-500/40]="notif.type === 'info'"
          [class.bg-amber-950/95]="notif.type === 'warning'"
          [class.border-amber-500/40]="notif.type === 'warning'"
          [class.bg-rose-950/95]="notif.type === 'error'"
          [class.border-rose-500/40]="notif.type === 'error'">
          <div
            class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            [class.bg-emerald-500/20]="notif.type === 'success'"
            [class.text-emerald-400]="notif.type === 'success'"
            [class.bg-sky-500/20]="notif.type === 'info'"
            [class.text-sky-400]="notif.type === 'info'"
            [class.bg-amber-500/20]="notif.type === 'warning'"
            [class.text-amber-400]="notif.type === 'warning'"
            [class.bg-rose-500/20]="notif.type === 'error'"
            [class.text-rose-400]="notif.type === 'error'">
            <mat-icon class="text-lg">
              @if (notif.type === 'success') { check_circle }
              @else if (notif.type === 'info') { info }
              @else if (notif.type === 'error') { error }
              @else { warning }
            </mat-icon>
          </div>
          <div class="flex-1 leading-snug">
            {{ notif.message }}
          </div>
          <button
            type="button"
            (click)="closeRequest.emit()"
            class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Fechar notificação">
            <mat-icon class="text-sm">close</mat-icon>
          </button>
        </div>
      </div>
    }
  `
})
export class NotificationToastComponent {
  notification = input.required<{message: string, type: 'success' | 'info' | 'warning' | 'error'} | null>();
  closeRequest = output<void>();
}
