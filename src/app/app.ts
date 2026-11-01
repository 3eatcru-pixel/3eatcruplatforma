import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { SecurityService } from './services/security.service';
import { UiNotificationService } from './services/ui-notification.service';
import { NotificationToastComponent } from './components/shared/notification-toast';
import { PillarHudComponent } from './components/shared/pillar-hud';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    RouterModule,
    NotificationToastComponent,
    PillarHudComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly security = inject(SecurityService);
  readonly notifications = inject(UiNotificationService);
}
