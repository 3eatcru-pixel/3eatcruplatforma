import { Injectable, signal } from '@angular/core';

export interface UiToastNotification {
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  id: number;
}

@Injectable({
  providedIn: 'root'
})
export class UiNotificationService {
  readonly notification = signal<UiToastNotification | null>(null);

  notify(message: string, type: UiToastNotification['type'] = 'success'): void {
    const id = Date.now();
    this.notification.set({ message, type, id });
    setTimeout(() => {
      if (this.notification()?.id === id) {
        this.notification.set(null);
      }
    }, 4200);
  }

  clearNotification(): void {
    this.notification.set(null);
  }
}
