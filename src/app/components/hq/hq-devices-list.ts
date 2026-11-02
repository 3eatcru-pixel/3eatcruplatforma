import { ChangeDetectionStrategy, Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { POSDevice } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-devices-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 animate-in fade-in duration-300">
       <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-950 space-y-4">
         
         <!-- INVENTORY HEADER -->
         <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#e8dfce]">
            <div>
              <h3 class="font-serif font-black text-sm uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <mat-icon class="text-amber-700">developer_board</mat-icon>
                <span>Inventário de Dispositivos</span>
              </h3>
              <p class="text-[11px] text-stone-600">Este inventário registra equipamentos por unidade. Não confirma conexão física e não gerencia motoristas ou rotas das lojas.</p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <button type="button" (click)="refreshDevices()" [disabled]="ecosystem.hqService.devicesStatus() === 'loading'" class="rounded-xl border border-[#d6c7b0] bg-white px-3 py-2 text-[10px] font-bold text-stone-800 hover:bg-[#f5ebd9] disabled:opacity-50">
                <mat-icon class="mr-1 align-middle text-xs">refresh</mat-icon>Atualizar
              </button>
              <button type="button" (click)="openRegisterModal.emit()" class="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-2 rounded-xl text-[10px] shadow cursor-pointer uppercase flex items-center gap-1.5">
                <mat-icon class="text-xs">add_to_queue</mat-icon>
                <span>Registrar dispositivo</span>
              </button>
            </div>
         </div>

         <!-- TENANT FILTER BAR -->
         <div class="flex flex-wrap items-center justify-between gap-3 bg-[#f5ebd9] p-3 rounded-xl border border-[#e6d8be] text-xs">
            <div class="flex items-center gap-2">
              <mat-icon class="text-amber-800 text-sm">filter_list</mat-icon>
              <span class="font-bold text-stone-800 uppercase text-[10px]">Filtrar Origem:</span>
            </div>

            <select
              [value]="selectedTenantFilter()"
              (change)="selectedTenantFilter.set($any($event.target).value)"
              class="bg-white border border-[#d6c7b0] rounded-xl px-3 py-1.5 text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600 cursor-pointer">
              <option value="all">Todas as lojas e registro HQ</option>
              <option value="hq">Registro de referência do HQ</option>
              @for (t of ecosystem.tenants(); track t.id) {
                <option [value]="t.id">🏪 Unidade: {{ t.name }}</option>
              }
            </select>

            <div class="text-[10px] font-mono text-stone-600 font-bold">
              Mostrando: <span class="text-amber-900 font-black">{{ filteredDevices().length }}</span> / {{ ecosystem.devices().length }} registros
            </div>
         </div>

         @if (ecosystem.hqService.devicesStatus() === 'loading') {
           <p role="status" class="rounded-xl border border-stone-300 bg-white px-4 py-3 text-xs text-stone-600">Carregando registros do inventário…</p>
         } @else if (ecosystem.hqService.devicesStatus() === 'error') {
           <p role="alert" class="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs text-rose-900">Não foi possível carregar o inventário. Use Atualizar para tentar novamente.</p>
         } @else if (ecosystem.hqService.devicesStatus() === 'loaded') {
           <!-- TERMINALS HARDWARE TABLE -->
           <div class="overflow-x-auto">
             <table class="w-full text-left text-xs border-collapse font-sans">
               <thead>
                 <tr class="text-[10px] font-mono font-bold uppercase text-amber-950/60 border-b-2 border-[#d0c2a8]">
                   <th class="py-2.5 px-3">REGISTRO DE DISPOSITIVO</th>
                   <th class="py-2.5 px-3">CATEGORIA / ORIGEM</th>
                   <th class="py-2.5 px-3 text-center">BATERIA REGISTRADA</th>
                   <th class="py-2.5 px-3">STATUS CADASTRADO</th>
                   <th class="py-2.5 px-3 text-right">AÇÕES NO INVENTÁRIO</th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-[#e8dfce]">
                 @for (device of filteredDevices(); track device.id) {
                   <tr class="hover:bg-[#f2e8d5] transition-colors">
                     <td class="py-3 px-3">
                       <div class="font-bold text-stone-900 flex items-center gap-2">
                         <mat-icon class="text-amber-800 text-sm">{{ device.type === 'tablet' ? 'tablet' : device.type === 'kiosk' ? 'kiosk' : 'desktop_windows' }}</mat-icon>
                         <span>{{ device.deviceName }}</span>
                       </div>
                       <div class="font-mono text-[9px] text-stone-500 pl-6">{{ device.serialNumber }} • {{ device.location || 'Localização não informada' }}</div>
                     </td>
                     <td class="py-3 px-3 font-medium">
                       @if (device.tenantId === 'hq') {
                         <span class="bg-amber-900 text-amber-200 border border-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono shadow-sm inline-flex items-center gap-1"><mat-icon class="text-[10px]">security</mat-icon><span>NÓ HQ CENTRAL</span></span>
                       } @else {
                         <span class="bg-stone-200 text-stone-800 border border-stone-300 px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1"><mat-icon class="text-[10px] text-amber-800">store</mat-icon><span>LOJA: {{ getTenantName(device.tenantId) }}</span></span>
                       }
                     </td>
                     <td class="py-3 px-3">
                       @if (device.batteryLevel !== undefined) {
                         <div class="flex items-center justify-center gap-1 font-mono font-bold" [class.text-rose-600]="device.batteryLevel < 20"><mat-icon class="text-sm">battery_full</mat-icon> {{ device.batteryLevel }}%</div>
                       } @else {
                         <span class="text-[9px] text-stone-500">Sem telemetria</span>
                       }
                     </td>
                     <td class="py-3 px-3"><span [class]="device.status === 'online' || device.status === 'unverified' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300'" class="border px-2 py-0.5 rounded text-[9px] font-bold uppercase">{{ device.status === 'online' ? 'online (registro)' : device.status === 'unverified' ? 'não verificado' : device.status }}</span></td>
                     <td class="py-3 px-3 text-right">
                       <div class="flex justify-end gap-1.5">
                         <button type="button" (click)="ecosystem.restartDevice(device.id)" [attr.aria-label]="'Registrar solicitação de reinício para ' + device.deviceName" class="p-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer" title="Registra solicitação; não reinicia o equipamento"><mat-icon class="text-sm">refresh</mat-icon></button>
                         <button type="button" (click)="ecosystem.lockDevice(device.id)" [attr.aria-label]="'Alterar estado salvo no inventário para ' + device.deviceName" class="p-1.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 cursor-pointer" title="Altera o status no inventário; não bloqueia o equipamento"><mat-icon class="text-sm">lock</mat-icon></button>
                       </div>
                     </td>
                   </tr>
                 } @empty {
                   <tr><td colspan="5" class="py-8 text-center text-stone-500 font-serif italic text-xs">Nenhum dispositivo encontrado para o filtro selecionado.</td></tr>
                 }
               </tbody>
             </table>
           </div>
           <p class="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-950">As ações de reinício e bloqueio alteram apenas registros administrativos. Sem um agente de hardware, não enviam comandos ao terminal. Motoristas, rotas e GPS são tratados pelo Store OS da própria unidade.</p>
         } @else {
           <p role="status" class="rounded-xl border border-stone-300 bg-white px-4 py-3 text-xs text-stone-600">O inventário ainda não sincronizou. Use Atualizar para carregar os registros.</p>
         }

       </div>
    </div>
  `
})
export class HqDevicesListComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly selectedTenantFilter = signal<string>('all');
  
  openRegisterModal = output<void>();

  readonly filteredDevices = computed(() => {
    const filter = this.selectedTenantFilter();
    const list = this.ecosystem.devices();
    if (filter === 'all') return list;
    return list.filter((d: POSDevice) => d.tenantId === filter);
  });

  getTenantName(tenantId: string): string {
    if (tenantId === 'hq') return 'HQ Central (Infraestrutura)';
    const tenant = this.ecosystem.tenants().find((item) => item.id === tenantId);
    return tenant?.name || 'Estabelecimento cadastrado';
  }

  refreshDevices(): void {
    void this.ecosystem.hqService.fetchDevices();
  }
}
