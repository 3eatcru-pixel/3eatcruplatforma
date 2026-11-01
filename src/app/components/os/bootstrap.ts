import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { SecurityService } from '../../services/security.service';

export type BootstrapStep = 'boot' | 'core' | 'auth' | 'device' | 'workspace' | 'apps';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-os-bootstrap',
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="fixed inset-0 z-[2000] bg-[#0d0704] flex flex-col items-center justify-center text-stone-200 overflow-hidden font-sans">
      
      <!-- BACKGROUND AMBIENCE -->
      <div class="absolute inset-0 bg-gradient-to-br from-amber-950/20 via-transparent to-stone-950/40"></div>
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent opacity-50"></div>

      <!-- MAIN SPLASH CONTENT -->
      <div class="relative z-10 flex flex-col items-center max-w-sm w-full px-8">
        
        <!-- LOGO ANIMATION -->
        <div class="logo-container mb-8 relative">
          <div class="w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 flex items-center justify-center font-black shadow-[0_0_60px_rgba(245,158,11,0.2)]">
            <mat-icon class="text-5xl scale-125">desktop_windows</mat-icon>
          </div>
          <!-- PULSE RINGS -->
          <div class="absolute inset-0 rounded-[2.5rem] border-2 border-amber-500/30 animate-ping"></div>
          <div class="absolute -inset-4 rounded-[3rem] border border-amber-500/10"></div>
        </div>

        <!-- PRODUCT IDENTITY -->
        <div class="text-center space-y-1 mb-12">
          <h1 class="text-2xl font-serif font-black tracking-tighter text-white">3EATCRU <span class="text-amber-500">STORE OS</span></h1>
          <p class="text-[10px] font-mono font-bold text-stone-500 uppercase tracking-[0.3em]">Ambiente Operacional v7.0</p>
        </div>

        <!-- PROGRESS STEPS -->
        <div class="w-full space-y-5">
          <div class="space-y-3">
             @for (step of steps; track step.id) {
               <div class="flex items-center gap-3 group transition-opacity duration-500" 
                    [class.opacity-40]="!isCurrentOrDone(step.id)"
                    [class.opacity-100]="isCurrentOrDone(step.id)">
                 <div class="w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300"
                      [class]="getStatusClass(step.id)">
                   @if (isDone(step.id)) {
                     <mat-icon class="text-[12px] font-bold">check</mat-icon>
                   } @else if (currentStep() === step.id) {
                     <div class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                   } @else {
                     <div class="w-1 h-1 rounded-full bg-stone-700"></div>
                   }
                 </div>
                 <div class="flex-1">
                   <div class="flex items-center justify-between">
                     <span class="text-[10px] font-bold uppercase tracking-wider transition-colors"
                           [class.text-amber-400]="currentStep() === step.id"
                           [class.text-stone-300]="isDone(step.id)"
                           [class.text-stone-600]="!isCurrentOrDone(step.id)">
                       {{ step.label }}
                     </span>
                     @if (currentStep() === step.id) {
                        <span class="text-[9px] font-mono text-amber-600 animate-pulse">{{ progress() }}%</span>
                     }
                   </div>
                   <div class="h-0.5 w-full bg-stone-900 rounded-full mt-1 overflow-hidden">
                      <div class="h-full bg-amber-500 transition-all duration-300" 
                           [style.width.%]="currentStep() === step.id ? progress() : (isDone(step.id) ? 100 : 0)"></div>
                   </div>
                 </div>
               </div>
             }
          </div>
        </div>

        <!-- DIAGNOSTIC FOOTER -->
        <div class="mt-16 w-full flex flex-col items-center">
           <div class="text-[9px] font-mono text-stone-600 flex items-center gap-2 mb-4">
              <span class="w-1 h-1 rounded-full bg-emerald-500"></span>
              <span>KERNEL_LOADED_OK</span>
              <span class="opacity-30">|</span>
              <span>ZONEL_READY</span>
           </div>
           <div class="px-4 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[10px] text-amber-500/60 font-medium italic">
             "Otimizando ambiente de alta performance para lojistas"
           </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .logo-container { perspective: 1000px; }
  `]
})
export class StoreOsBootstrapComponent implements OnInit {
  @Output() completed = new EventEmitter<void>();
  
  private readonly security = inject(SecurityService);
  
  readonly currentStep = signal<BootstrapStep>('boot');
  readonly progress = signal<number>(0);
  readonly doneSteps = signal<Set<BootstrapStep>>(new Set());

  readonly steps: { id: BootstrapStep; label: string }[] = [
    { id: 'boot', label: 'BOOT / Identidade Visual' },
    { id: 'core', label: 'CORE / Preparação do Ambiente' },
    { id: 'auth', label: 'AUTH / Validação de Identidade' },
    { id: 'device', label: 'DEVICE / Hardware & Periféricos' },
    { id: 'workspace', label: 'WORKSPACE / Desktop Launcher' },
    { id: 'apps', label: 'APPS / Prontidão de Sistema' }
  ];

  async ngOnInit() {
    await this.runSequence();
  }

  private async runSequence() {
    // 1. BOOT
    await this.performStep('boot', 800);
    
    // 2. CORE
    await this.performStep('core', 1000);

    // 3. AUTH (Critical Step - Wait for actual auth)
    this.currentStep.set('auth');
    this.progress.set(20);
    await this.security.waitForAuth();
    this.progress.set(100);
    await this.delay(400);
    this.markDone('auth');

    // 4. DEVICE
    await this.performStep('device', 900);

    // 5. WORKSPACE
    await this.performStep('workspace', 1200);

    // 6. APPS
    await this.performStep('apps', 600);

    // FINISH
    this.completed.emit();
  }

  private async performStep(id: BootstrapStep, duration: number) {
    this.currentStep.set(id);
    const intervals = 10;
    const stepDuration = duration / intervals;
    
    for (let i = 1; i <= intervals; i++) {
      this.progress.set((i / intervals) * 100);
      await this.delay(stepDuration);
    }
    
    this.markDone(id);
  }

  private markDone(id: BootstrapStep) {
    this.doneSteps.update(s => {
      const next = new Set(s);
      next.add(id);
      return next;
    });
  }

  isDone(id: BootstrapStep): boolean {
    return this.doneSteps().has(id);
  }

  isCurrentOrDone(id: BootstrapStep): boolean {
    if (this.isDone(id)) return true;
    return this.currentStep() === id;
  }

  getStatusClass(id: BootstrapStep): string {
    if (this.isDone(id)) return 'bg-amber-500/20 border-amber-500/40 text-amber-400';
    if (this.currentStep() === id) return 'bg-amber-500/10 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.2)]';
    return 'bg-stone-900 border-stone-800 text-stone-700';
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
