import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-eapp-instagram',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="h-full flex flex-col bg-[#121212] text-stone-200 font-sans select-none overflow-hidden p-4 space-y-4">
      
      <!-- HEADER INSTAGRAM BUSINESS -->
      <div class="flex items-center justify-between gap-3 bg-[#1e1e1e] p-3 rounded-2xl border border-white/10 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-600 to-purple-600 text-white flex items-center justify-center shadow">
            <mat-icon class="text-xl">camera_alt</mat-icon>
          </div>
          <div>
            <h2 class="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Instagram • Protótipo local</span>
            </h2>
            <p class="text-[10px] text-stone-400">Publicações de exemplo; não consulta nem publica no Instagram.</p>
          </div>
        </div>

        <span class="text-[10px] font-bold text-amber-300">Dados demonstrativos</span>
      </div>

      <!-- FEED POSTS PREVIEW -->
      <div class="flex-1 min-h-0 overflow-y-auto custom-scrollbar space-y-3">
        <h3 class="text-xs font-bold text-stone-400 uppercase tracking-wider">Publicações Recentes & Pratos em Destaque</h3>
        
        <div class="grid grid-cols-3 gap-2">
          @for (post of posts; track post.id) {
            <div class="bg-[#1e1e1e] border border-white/5 rounded-xl p-2 space-y-1.5 flex flex-col justify-between">
              <div class="w-full h-24 bg-gradient-to-br from-[#2a1307] to-amber-950 rounded-lg flex items-center justify-center text-amber-500/60">
                <mat-icon class="text-3xl">{{ post.icon }}</mat-icon>
              </div>
              <div>
                <strong class="text-xs text-white block line-clamp-1">{{ post.title }}</strong>
                <span class="text-[10px] text-stone-400 font-mono">{{ post.likes }} curtidas</span>
              </div>
            </div>
          }
        </div>
      </div>

    </div>
  `
})
export class EAppInstagramWindow {
  readonly posts = [
    { id: '1', title: 'Festival de Hambúrguer Artesanal', likes: '1.240', icon: 'lunch_dining' },
    { id: '2', title: 'Rodízio de Pizzas Forno a Lenha', likes: '890', icon: 'local_pizza' },
    { id: '3', title: 'Sobremesas Especiais de Inverno', likes: '2.100', icon: 'icecream' }
  ];
}
