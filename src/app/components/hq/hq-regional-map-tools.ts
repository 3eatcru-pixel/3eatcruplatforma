import { ChangeDetectionStrategy, Component, inject, signal, ElementRef, viewChild, afterNextRender, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import type * as L from 'leaflet';
import { EcosystemService } from '../../services/ecosystem.service';
import { MapToolsService, MapCoord } from '../../services/map-tools.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hq-regional-map-tools',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="bg-[#1d1008] border-2 border-[#4d2813] rounded-3xl p-6 shadow-2xl space-y-6">
      <div class="flex items-center justify-between border-b border-[#3d200f] pb-3">
        <h3 class="font-serif font-black text-white text-base flex items-center gap-2">
          <mat-icon class="text-amber-500">map</mat-icon>
          Análise de Clusters Geodésicos (Free Map Tools)
        </h3>
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-widest bg-emerald-950/40 px-2 py-1 rounded border border-emerald-800/30">
            {{ tenantsInCluster().length }} Lojas no Raio
          </span>
          <span class="text-[9px] font-mono text-amber-500 font-bold uppercase tracking-widest bg-[#170b04] px-2 py-1 rounded-lg border border-[#3d200f]">OpenFreeMap Liberty</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- LEFT: TACTICAL CONTROLS -->
        <div class="lg:col-span-4 space-y-4">
          <div class="bg-[#2a160b] border border-[#482814] rounded-2xl p-4 space-y-4">
            <div class="space-y-2">
               <span class="text-[10px] font-mono font-bold text-amber-500 uppercase block">Ferramenta Ativa</span>
               <div class="grid grid-cols-2 gap-2">
                 <button 
                   type="button"
                   (click)="toolMode.set('radius')"
                   [class]="toolMode() === 'radius' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#1a0e07] text-amber-400 border border-[#4d2813]'"
                   class="p-3 rounded-xl text-[10px] uppercase flex flex-col items-center gap-1 transition-all cursor-pointer">
                   <mat-icon class="text-sm">radio_button_checked</mat-icon>
                   Raio Entrega
                 </button>
                 <button 
                   type="button"
                   (click)="toolMode.set('area')"
                   [class]="toolMode() === 'area' ? 'bg-amber-600 text-stone-950 font-black' : 'bg-[#1a0e07] text-amber-400 border border-[#4d2813]'"
                   class="p-3 rounded-xl text-[10px] uppercase flex flex-col items-center gap-1 transition-all cursor-pointer">
                   <mat-icon class="text-sm">polyline</mat-icon>
                   Área Polígono
                 </button>
               </div>
            </div>

            @if (toolMode() === 'radius') {
              <div class="space-y-3 animate-in fade-in">
                <div class="space-y-1">
                  <label for="clusterRadiusInput" class="text-[10px] font-mono font-bold text-amber-500 uppercase">Raio do Cluster ({{ radiusKm() }} KM)</label>
                  <input 
                    id="clusterRadiusInput"
                    type="range" min="1" max="50" [value]="radiusKm()" 
                    (input)="radiusKm.set($any($event.target).valueAsNumber)"
                    class="w-full accent-amber-500 bg-[#1a0e07] rounded-lg h-1.5 cursor-pointer">
                </div>
                <p class="text-[9px] text-stone-400 italic">Clique no mapa para posicionar o centro do cluster geodésico.</p>
              </div>
            }

            @if (toolMode() === 'area') {
              <div class="space-y-3 animate-in fade-in">
                <div class="bg-[#1a0e07] p-3 rounded-xl border border-[#4d2813] space-y-1">
                   <div class="text-[10px] font-mono text-stone-400 uppercase">Área Calculada</div>
                   <div class="text-lg font-serif font-black text-amber-400">{{ (areaSqM() / 1000000).toFixed(4) }} KM²</div>
                   <div class="text-[8px] text-stone-500">({{ areaSqM().toLocaleString() }} m²)</div>
                </div>
                <button type="button" (click)="clearArea()" class="w-full bg-rose-950 text-rose-300 border border-rose-800 p-2 rounded-xl text-[10px] font-bold uppercase cursor-pointer">Limpar Polígono</button>
                <p class="text-[9px] text-stone-400 italic">Clique em 3 ou mais pontos para fechar a área tática.</p>
              </div>
            }

            <div class="pt-4 border-t border-[#4d2813] space-y-2">
               <div class="text-[10px] font-mono font-bold text-stone-500 uppercase">Coordenadas do Cursor</div>
               <div class="bg-[#1a0e07] p-2 rounded-lg font-mono text-[9px] text-amber-500/80 grid grid-cols-1 gap-1">
                 <div>LAT: {{ mapTools.toDMS(cursorCoord().lat, true) }}</div>
                 <div>LNG: {{ mapTools.toDMS(cursorCoord().lng, false) }}</div>
               </div>
            </div>
          </div>
        </div>

        <!-- RIGHT: ANALYSIS MAP -->
        <div class="lg:col-span-8">
          <div class="rounded-3xl border border-[#4d2813] overflow-hidden relative bg-stone-900 h-[450px]">
            <div #mapContainer class="w-full h-full opacity-90 grayscale-[0.3]"></div>
            
            <!-- OVERLAY: LIST OF TENANTS IN CLUSTER -->
            @if (toolMode() === 'radius' && tenantsInCluster().length > 0) {
              <div class="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-md border border-amber-600/30 p-3 rounded-2xl z-[1000] animate-in slide-in-from-bottom">
                <div class="text-[10px] font-black uppercase text-amber-400 mb-2 flex justify-between">
                  <span>Estabelecimentos Impactados</span>
                  <span>CENTRO: {{ mapTools.toDMS(centerPoint().lat, true) }}</span>
                </div>
                <div class="flex gap-2 overflow-x-auto no-scrollbar">
                  @for (t of tenantsInCluster(); track t.id) {
                    <div class="bg-[#1d1008] border border-[#4d2813] p-2 rounded-xl min-w-[120px] flex flex-col gap-1">
                       <span class="text-[10px] font-bold text-white truncate">{{ t.name }}</span>
                       <span class="text-[8px] text-amber-500 font-mono">{{ t.plan }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class HqRegionalMapToolsComponent {
  readonly ecosystem = inject(EcosystemService);
  readonly mapTools = inject(MapToolsService);

  private readonly mapContainer = viewChild<ElementRef>('mapContainer');
  private map: L.Map | null = null;
  private L: typeof import('leaflet') | null = null;
  private markersLayer: L.LayerGroup | null = null;
  private toolLayer: L.LayerGroup | null = null;

  readonly toolMode = signal<'radius' | 'area'>('radius');
  readonly radiusKm = signal<number>(10);
  readonly centerPoint = signal<MapCoord>({ lat: -23.5651, lng: -46.6521 });
  readonly areaPoints = signal<MapCoord[]>([]);
  readonly cursorCoord = signal<MapCoord>({ lat: -23.5651, lng: -46.6521 });

  readonly areaSqM = computed(() => this.mapTools.calculateArea(this.areaPoints()));

  readonly tenantsInCluster = computed(() => {
    if (this.toolMode() !== 'radius') return [];
    const center = this.centerPoint();
    const radius = this.radiusKm();
    
    return this.ecosystem.tenants().filter(t => {
      const tLat = t.lat || (-23.5651 + (Math.random() - 0.5) * 0.2);
      const tLng = t.lng || (-46.6521 + (Math.random() - 0.5) * 0.2);
      const dist = this.mapTools.calculateDistance(center, { lat: tLat, lng: tLng });
      return dist.km <= radius;
    });
  });

  constructor() {
    afterNextRender(async () => {
      this.L = (await import('leaflet')).default;
      this.initMap();
    });

    effect(() => {
      if (this.map && this.L) {
        this.updateToolVisuals();
      }
    });
  }

  private initMap() {
    const container = this.mapContainer()?.nativeElement;
    if (!container || !this.L) return;

    // OpenFreeMap Tiles (Liberty style for analysis)
    const tileUrl = 'https://tiles.openfreemap.org/styles/liberty/{z}/{x}/{y}.png';

    this.map = this.L.map(container, {
      center: [-23.5651, -46.6521], 
      zoom: 11,
      zoomControl: true,
      attributionControl: false
    });

    this.L.tileLayer(tileUrl).addTo(this.map);
    this.markersLayer = this.L.layerGroup().addTo(this.map);
    this.toolLayer = this.L.layerGroup().addTo(this.map);

    this.map.on('mousemove', (e: L.LeafletMouseEvent) => {
      this.cursorCoord.set({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const mode = this.toolMode();
      if (mode === 'radius') {
        this.centerPoint.set({ lat: e.latlng.lat, lng: e.latlng.lng });
      } else {
        this.areaPoints.update(p => [...p, { lat: e.latlng.lat, lng: e.latlng.lng }]);
      }
    });

    // Add store markers
    this.ecosystem.tenants().forEach(t => {
      if (!this.L || !this.markersLayer) return;
      const lat = t.lat || (-23.5651 + (Math.random() - 0.5) * 0.25);
      const lng = t.lng || (-46.6521 + (Math.random() - 0.5) * 0.25);
      
      const icon = this.L.divIcon({
        className: 'store-icon',
        html: `<div class="w-5 h-5 rounded-lg bg-amber-900 border border-amber-400 flex items-center justify-center text-[8px] text-white font-bold shadow-lg">${t.name.charAt(0)}</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      this.L.marker([lat, lng], { icon }).addTo(this.markersLayer);
    });
  }

  private updateToolVisuals() {
    if (!this.L || !this.toolLayer) return;
    this.toolLayer.clearLayers();

    const mode = this.toolMode();
    if (mode === 'radius') {
      const center = this.centerPoint();
      const radiusM = this.radiusKm() * 1000;
      
      this.L.circle([center.lat, center.lng], {
        radius: radiusM,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.1,
        weight: 2
      }).addTo(this.toolLayer);

      const centerIcon = this.L.divIcon({
        className: 'center-icon',
        html: `<div class="w-4 h-4 rounded-full bg-amber-600 border-2 border-white animate-pulse"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      this.L.marker([center.lat, center.lng], { icon: centerIcon }).addTo(this.toolLayer);
    } else {
      const points = this.areaPoints();
      points.forEach(p => {
        if (!this.L || !this.toolLayer) return;
        const icon = this.L.divIcon({
          className: 'area-point',
          html: `<div class="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></div>`,
          iconSize: [8, 8],
          iconAnchor: [4, 4]
        });
        this.L.marker([p.lat, p.lng], { icon }).addTo(this.toolLayer);
      });

      if (points.length >= 2) {
        const latlngs: [number, number][] = points.map(p => [p.lat, p.lng]);
        if (points.length >= 3) {
          this.L.polygon(latlngs, {
            color: '#f59e0b',
            fillColor: '#f59e0b',
            fillOpacity: 0.2,
            weight: 2
          }).addTo(this.toolLayer);
        } else {
          this.L.polyline(latlngs, { color: '#f59e0b', weight: 2, dashArray: '5, 5' }).addTo(this.toolLayer);
        }
      }
    }
  }

  clearArea() {
    this.areaPoints.set([]);
  }
}
