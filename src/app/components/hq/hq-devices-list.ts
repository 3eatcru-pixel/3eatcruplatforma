import { ChangeDetectionStrategy, Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { EcosystemService } from '../../services/ecosystem.service';
import { POSDevice, StoreDriver, DeliveryRoute } from '../../models/ecosystem.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-devices-list',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="space-y-4 animate-in fade-in duration-300">
       <div class="bg-[#faf7f0] border border-[#ded4c2] rounded-2xl p-5 shadow-xl text-stone-950 space-y-4">
         
         <!-- TOP MDM HEADER & MODE TOGGLE -->
         <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#e8dfce]">
            <div>
              <h3 class="font-serif font-black text-sm uppercase tracking-wider text-amber-900 flex items-center gap-2">
                <mat-icon class="text-amber-700">developer_board</mat-icon>
                <span>Inventário de Dispositivos</span>
              </h3>
              <p class="text-[11px] text-stone-600">O cadastro de dispositivos não confirma conexão física. Não há agente de terminais conectado para telemetria ou comandos remotos. Dados de motoristas abaixo são registros armazenados, sem consulta de GPS em tempo real.</p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <div class="bg-[#f0e4d0] p-1 rounded-xl border border-[#d6c3aa] flex items-center gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  (click)="mdmMode.set('terminals')"
                  [class]="mdmMode() === 'terminals' ? 'bg-amber-800 text-amber-50 shadow' : 'text-stone-700 hover:text-stone-950'"
                  class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-mono">
                  <mat-icon class="text-xs">desktop_windows</mat-icon>
                  <span>Registros de dispositivos ({{ ecosystem.devices().length }})</span>
                </button>
                <button
                  type="button"
                  (click)="mdmMode.set('drivers')"
                  [class]="mdmMode() === 'drivers' ? 'bg-amber-800 text-amber-50 shadow' : 'text-stone-700 hover:text-stone-950'"
                  class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-mono">
                  <mat-icon class="text-xs">two_wheeler</mat-icon>
                  <span>Motoristas cadastrados ({{ ecosystem.drivers().length }})</span>
                </button>
                <button
                  type="button"
                  (click)="mdmMode.set('routes')"
                  [class]="mdmMode() === 'routes' ? 'bg-amber-800 text-amber-50 shadow' : 'text-stone-700 hover:text-stone-950'"
                  class="px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-mono">
                  <mat-icon class="text-xs">alt_route</mat-icon>
                  <span>Rotas &amp; Logística Global ({{ ecosystem.deliveryRoutes().length }})</span>
                </button>
              </div>

              @if (mdmMode() === 'terminals') {
                <button (click)="openRegisterModal.emit()" class="bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold px-3 py-2 rounded-xl text-[10px] shadow cursor-pointer uppercase flex items-center gap-1.5">
                  <mat-icon class="text-xs">add_to_queue</mat-icon>
                  <span>Registrar dispositivo</span>
                </button>
              }
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
              @if (mdmMode() === 'terminals') {
                Mostrando: <span class="text-amber-900 font-black">{{ filteredDevices().length }}</span> / {{ ecosystem.devices().length }} registros
              } @else if (mdmMode() === 'drivers') {
                Mostrando: <span class="text-amber-900 font-black">{{ filteredDrivers().length }}</span> / {{ ecosystem.drivers().length }} motoristas
              } @else {
                Mostrando: <span class="text-amber-900 font-black">{{ filteredRoutes().length }}</span> / {{ ecosystem.deliveryRoutes().length }} rotas
              }
            </div>
         </div>

         <!-- TERMINALS HARDWARE TABLE -->
         @if (mdmMode() === 'terminals') {
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
                         <mat-icon class="text-amber-800 text-sm">
                           {{ device.type === 'tablet' ? 'tablet' : device.type === 'kiosk' ? 'kiosk' : 'desktop_windows' }}
                         </mat-icon>
                         <span>{{ device.deviceName }}</span>
                       </div>
                       <div class="font-mono text-[9px] text-stone-500 pl-6">{{ device.serialNumber }} • {{ device.location || 'Localização não informada' }}</div>
                     </td>
                     <td class="py-3 px-3 font-medium">
                       @if (device.tenantId === 'hq') {
                         <span class="bg-amber-900 text-amber-200 border border-amber-700 px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono shadow-sm inline-flex items-center gap-1">
                           <mat-icon class="text-[10px]">security</mat-icon>
                           <span>NÓ HQ CENTRAL</span>
                         </span>
                       } @else {
                         <span class="bg-stone-200 text-stone-800 border border-stone-300 px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1">
                           <mat-icon class="text-[10px] text-amber-800">store</mat-icon>
                           <span>LOJA: {{ getTenantName(device.tenantId) }}</span>
                         </span>
                       }
                     </td>
                     <td class="py-3 px-3">
                        @if (device.batteryLevel !== undefined) {
                          <div class="flex items-center justify-center gap-1 font-mono font-bold" [class.text-rose-600]="device.batteryLevel < 20">
                            <mat-icon class="text-sm">battery_full</mat-icon> {{ device.batteryLevel }}%
                          </div>
                        } @else {
                          <span class="text-[9px] text-stone-500">Sem telemetria</span>
                        }
                     </td>
                     <td class="py-3 px-3">
                       <span [class]="device.status === 'online' || device.status === 'unverified' ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300'" class="border px-2 py-0.5 rounded text-[9px] font-bold uppercase">{{ device.status === 'online' ? 'online (registro)' : device.status === 'unverified' ? 'não verificado' : device.status }}</span>
                     </td>
                     <td class="py-3 px-3 text-right">
                       <div class="flex justify-end gap-1.5">
                         <button type="button" (click)="ecosystem.restartDevice(device.id)" class="p-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 cursor-pointer" title="Registrar solicitação; não reinicia o equipamento"><mat-icon class="text-sm">refresh</mat-icon></button>
                         <button type="button" (click)="ecosystem.lockDevice(device.id)" class="p-1.5 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 hover:bg-rose-200 cursor-pointer" title="Alterar status no inventário; não bloqueia o equipamento"><mat-icon class="text-sm">lock</mat-icon></button>
                       </div>
                     </td>
                   </tr>
                 } @empty {
                   <tr>
                     <td colspan="5" class="py-8 text-center text-stone-500 font-serif italic text-xs">
                       Nenhum dispositivo encontrado para o filtro selecionado.
                     </td>
                   </tr>
                 }
               </tbody>
             </table>
           </div>
         }

         <!-- DRIVER RECORDS -->
         @if (mdmMode() === 'drivers') {
           <div class="overflow-x-auto">
             <table class="w-full text-left text-xs border-collapse font-sans">
               <thead>
                 <tr class="text-[10px] font-mono font-bold uppercase text-amber-950/60 border-b-2 border-[#d0c2a8]">
                   <th class="py-2.5 px-3">MOTORISTA / VERSÃO INFORMADA</th>
                   <th class="py-2.5 px-3">VÍNCULO &amp; TIPO</th>
                   <th class="py-2.5 px-3">LOCALIZAÇÃO INFORMADA</th>
                   <th class="py-2.5 px-3 text-center">BATERIA INFORMADA</th>
                   <th class="py-2.5 px-3 text-center">STATUS DOCUMENTAL</th>
                   <th class="py-2.5 px-3 text-right">CONTROLE</th>
                 </tr>
               </thead>
               <tbody class="divide-y divide-[#e8dfce]">
                 @for (driver of filteredDrivers(); track driver.id) {
                   <tr class="hover:bg-[#f2e8d5] transition-colors">
                     <td class="py-3 px-3">
                       <div class="font-bold text-stone-900 flex items-center gap-2">
                         <mat-icon class="text-amber-800 text-sm">
                           {{ driver.vehicleType === 'bike' ? 'directions_bike' : driver.vehicleType === 'carro' ? 'directions_car' : 'two_wheeler' }}
                         </mat-icon>
                         <span>{{ driver.name }}</span>
                       </div>
                       <div class="font-mono text-[9px] text-stone-500 pl-6">
                         {{ driver.deviceName || 'Dispositivo não informado' }} • {{ driver.appVersion || 'Versão não informada' }}
                       </div>
                     </td>

                     <td class="py-3 px-3">
                       @if (driver.driverType === 'platform') {
                         <span class="bg-purple-900 text-purple-100 border border-purple-700 px-2 py-0.5 rounded text-[9px] font-black uppercase font-mono shadow-sm inline-flex items-center gap-1">
                           <mat-icon class="text-[10px]">stars</mat-icon>
                           <span>MOTORISTA PLATAFORMA (HQ)</span>
                         </span>
                       } @else {
                         <span class="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1">
                           <mat-icon class="text-[10px]">store</mat-icon>
                           <span>FROTA PRÓPRIA: {{ getTenantName(driver.tenantId || '') }}</span>
                         </span>
                       }
                     </td>

                     <td class="py-3 px-3">
                       <div class="font-bold text-stone-900 flex items-center gap-1 text-[11px]">
                         <mat-icon class="text-xs text-emerald-700">my_location</mat-icon>
                         <span>{{ driver.currentLocationName || 'Localização não informada' }}</span>
                       </div>
                       <div class="font-mono text-[9px] text-stone-500 pl-4">
                         Registro: {{ driver.lastGpsPing ? (driver.lastGpsPing | date:'dd/MM/yyyy HH:mm') : 'Sem registro' }}
                       </div>
                     </td>

                     <td class="py-3 px-3 text-center">
                       @if (driver.batteryLevel !== undefined) {
                         <div class="flex items-center justify-center gap-1 font-mono font-bold" [class.text-rose-600]="driver.batteryLevel < 20">
                           <mat-icon class="text-sm">battery_full</mat-icon> {{ driver.batteryLevel }}%
                         </div>
                       } @else {
                         <span class="text-[9px] text-stone-500">Sem telemetria</span>
                       }
                     </td>

                     <td class="py-3 px-3 text-center">
                       @if (driver.complianceVerified) {
                         <span class="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded text-[9px] font-black inline-flex items-center gap-1">
                           <mat-icon class="text-[10px]">verified</mat-icon>
                           <span>MARCADO COMO VERIFICADO</span>
                         </span>
                       } @else {
                          <span class="bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded text-[9px] font-bold">NÃO VERIFICADO</span>
                       }
                     </td>

                     <td class="py-3 px-3 text-right">
                       <div class="flex justify-end gap-1.5">
                         <span class="text-[9px] text-stone-500">Sem agente de GPS ou canal de atualização conectado</span>
                       </div>
                     </td>
                   </tr>
                 } @empty {
                   <tr>
                     <td colspan="6" class="py-8 text-center text-stone-500 font-serif italic text-xs">
                       Nenhum motorista registrado para a busca/filtro selecionado.
                     </td>
                   </tr>
                 }
               </tbody>
             </table>
           </div>
         }

          <!-- PLATFORM ROUTES GLOBAL MONITORING TABLE -->
          @if (mdmMode() === 'routes') {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr class="text-[10px] font-mono font-bold uppercase text-amber-950/60 border-b-2 border-[#d0c2a8]">
                    <th class="py-2.5 px-3">CÓDIGO DA ROTA</th>
                    <th class="py-2.5 px-3">LOJA DE ORIGEM</th>
                    <th class="py-2.5 px-3">MOTORISTA ATRIBUÍDO</th>
                    <th class="py-2.5 px-3">PARADAS / ENTREGAS</th>
                    <th class="py-2.5 px-3 text-center">DISTÂNCIA / TEMPO</th>
                    <th class="py-2.5 px-3 text-center">VALOR DA ROTA</th>
                    <th class="py-2.5 px-3 text-right">STATUS DA ROTA</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[#e8dfce]">
                  @for (route of filteredRoutes(); track route.id) {
                    <tr class="hover:bg-[#f2e8d5] transition-colors">
                      <td class="py-3 px-3 font-mono font-black text-stone-900">
                        <div class="flex items-center gap-1.5">
                          <mat-icon class="text-xs text-amber-800">route</mat-icon>
                          <span>{{ route.routeCode }}</span>
                        </div>
                        <div class="text-[9px] text-stone-500 font-sans font-normal">{{ route.date }} • {{ route.timeWindow }}</div>
                      </td>

                      <td class="py-3 px-3">
                        <span class="bg-stone-200 text-stone-800 border border-stone-300 px-2 py-0.5 rounded text-[9px] font-bold inline-flex items-center gap-1">
                          <mat-icon class="text-[10px] text-amber-800">store</mat-icon>
                          <span>{{ getTenantName(route.tenantId) }}</span>
                        </span>
                      </td>

                      <td class="py-3 px-3">
                        @if (route.driverName) {
                          <div class="font-bold text-stone-900 flex items-center gap-1">
                            <mat-icon class="text-xs text-purple-700">two_wheeler</mat-icon>
                            <span>{{ route.driverName }}</span>
                          </div>
                          <div class="text-[9px] text-stone-500 font-mono">{{ route.driverPhone || 'App 3EAT' }}</div>
                        } @else {
                          <span class="text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded text-[9px] font-bold">
                            Aguardando Motorista
                          </span>
                        }
                      </td>

                      <td class="py-3 px-3">
                        <div class="font-bold text-stone-900">{{ route.waypoints.length }} paradas</div>
                        <div class="text-[9px] text-stone-500 truncate max-w-xs">
                          {{ route.waypoints[0]?.address || 'Entrega local' }}
                        </div>
                      </td>

                      <td class="py-3 px-3 text-center font-mono">
                        <div class="font-black text-stone-900">{{ route.totalDistanceKm }} km</div>
                        <div class="text-[9px] text-stone-500">{{ route.estimatedDuration }}</div>
                      </td>

                      <td class="py-3 px-3 text-center font-mono font-black text-emerald-800">
                        @if (route.totalEarnings > 0) {
                          R$ {{ route.totalEarnings.toFixed(2) }}
                        } @else {
                          <span class="text-amber-800">A combinar</span>
                        }
                        <div class="text-[8px] font-sans font-normal text-stone-500">Informado pela loja; sem registro de pagamento</div>
                      </td>

                      <td class="py-3 px-3 text-right">
                        <span
                          [class]="route.status === 'completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : route.status === 'in_progress' ? 'bg-indigo-100 text-indigo-800 border-indigo-300' : route.status === 'at_store' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-stone-200 text-stone-700 border-stone-300'"
                          class="border px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                          {{ route.status === 'completed' ? 'Concluída' : route.status === 'in_progress' ? 'Em Rota' : route.status === 'at_store' ? 'Na Loja' : route.status === 'accepted' ? 'Aceita' : 'Disponível' }}
                        </span>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="7" class="py-8 text-center text-stone-500 font-serif italic text-xs">
                        Nenhuma rota de entrega encontrada para a unidade ou filtro selecionado.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

       </div>
    </div>
  `
})
export class HqDevicesListComponent {
  readonly ecosystem = inject(EcosystemService);
  
  readonly mdmMode = signal<'terminals' | 'drivers' | 'routes'>('terminals');
  readonly selectedTenantFilter = signal<string>('all');
  
  openRegisterModal = output<void>();

  readonly filteredDevices = computed(() => {
    const filter = this.selectedTenantFilter();
    const list = this.ecosystem.devices();
    if (filter === 'all') return list;
    return list.filter((d: POSDevice) => d.tenantId === filter);
  });

  readonly filteredDrivers = computed(() => {
    const list = this.ecosystem.drivers();
    const filter = this.selectedTenantFilter();
    if (filter === 'all') return list;
    if (filter === 'hq') return list.filter((d: StoreDriver) => d.tenantId === 'hq' || d.driverType === 'platform');
    return list.filter((d: StoreDriver) => d.tenantId === filter);
  });

  readonly filteredRoutes = computed(() => {
    const list = this.ecosystem.deliveryRoutes();
    const filter = this.selectedTenantFilter();
    if (filter === 'all' || filter === 'hq') return list;
    return list.filter((r: DeliveryRoute) => r.tenantId === filter);
  });

  getTenantName(tenantId: string): string {
    if (tenantId === 'hq') return 'HQ Central (Infraestrutura)';
    const t = this.ecosystem.tenants().find(x => x.id === tenantId);
    return t ? t.name : 'Estabelecimento Cadastrado';
  }
}
