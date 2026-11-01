import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PosTerminalComponent } from '../pos-terminal';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-pos',
  standalone: true,
  imports: [CommonModule, PosTerminalComponent],
  template: `
    <div class="h-full w-full overflow-hidden rounded-xl border border-[#381c0c] bg-[#0a0705]">
      <app-pos-terminal />
    </div>
  `
})
export class EAppPosWindow {}
