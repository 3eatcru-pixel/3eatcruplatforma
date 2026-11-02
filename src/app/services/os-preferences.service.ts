import { Injectable, inject, signal, effect } from '@angular/core';
import { OSAppId, OSWindow } from '../models/os.model';
import { OperationalSegmentProfileId } from '../models/ecosystem.model';
import { UiNotificationService } from './ui-notification.service';

export interface OSWorkspace {
  id: string;
  name: string;
  windows: Partial<OSWindow>[];
  activeWinId: OSAppId | null;
}

export interface OperationalProfilePreset {
  id: OperationalSegmentProfileId;
  label: string;
  shortLabel: string;
  icon: string;
  posSector: 'restaurant' | 'retail' | 'pharmacy' | 'services';
  shortcuts: OSAppId[];
  favorites: OSAppId[];
  quickSwitcher: { id: OSAppId; label: string }[];
}

export interface OSPreferences {
  version: number;
  wallpaper: 'carbon' | 'amber' | 'emerald' | 'obsidian';
  operationalProfile: OperationalSegmentProfileId;
  customProfileChosen?: boolean;
  shortcuts: OSAppId[];
  favorites: OSAppId[];
  workspaces: OSWorkspace[];
  currentWorkspaceId: string | null;
  sessionWindows?: Partial<OSWindow>[];
  sessionActiveWinId?: OSAppId | null;
}

const PREFS_STORAGE_KEY = '3eatcru_os_prefs';
const SCHEMA_VERSION = 3;

function migrateLegacyAppId(id: unknown): OSAppId | null {
  if (typeof id !== 'string') return null;
  if (id === 'ifood') return 'delivery-marketplaces';
  return id as OSAppId;
}

function migrateWindowIds(windows: Partial<OSWindow>[]): Partial<OSWindow>[] {
  return windows.map((window) => {
    const legacyId = window.id as string | undefined;
    const migratedId = migrateLegacyAppId(window.id);
    if (!migratedId) return window;
    return {
      ...window,
      id: migratedId,
      ...(legacyId === 'ifood' ? { title: 'Pedidos de Marketplaces', icon: 'delivery_dining' } : {})
    };
  });
}

export const SEGMENT_PROFILE_PRESETS: Record<
  OperationalSegmentProfileId,
  OperationalProfilePreset
> = {
  restaurant: {
    id: 'restaurant',
    label: 'Restaurante (Mesas, KDS, Reservas)',
    shortLabel: 'Restaurante',
    icon: 'restaurant',
    posSector: 'restaurant',
    shortcuts: [
      'pos',
      'tables',
      'kds',
      'agenda',
      'delivery-marketplaces',
      'drivers',
      'inventory',
      'finance',
      'store-manager',
      'crm',
      'whatsapp',
      'admin-hub',
      'docs'
    ],
    favorites: ['pos', 'tables', 'kds', 'agenda'],
    quickSwitcher: [
      { id: 'pos', label: 'PDV' },
      { id: 'tables', label: 'Mesas' },
      { id: 'kds', label: 'KDS' },
      { id: 'agenda', label: 'Reservas' }
    ]
  },
  retail_electro: {
    id: 'retail_electro',
    label: 'Varejo & Eletro (EAN-13, Série, Atacado)',
    shortLabel: 'Varejo & Eletro',
    icon: 'devices_other',
    posSector: 'retail',
    shortcuts: [
      'pos',
      'inventory',
      'stock-audit',
      'suppliers',
      'finance',
      'reconciliation',
      'crm',
      'store-manager',
      'history',
      'reports',
      'admin-hub',
      'docs'
    ],
    favorites: ['pos', 'inventory', 'suppliers', 'finance'],
    quickSwitcher: [
      { id: 'pos', label: 'PDV EAN' },
      { id: 'inventory', label: 'Estoque' },
      { id: 'suppliers', label: 'Compras' },
      { id: 'finance', label: 'Caixa' }
    ]
  },
  pharmacy: {
    id: 'pharmacy',
    label: 'Farmácia & Saúde (Lotes, Receita, CRM)',
    shortLabel: 'Farmácia & Saúde',
    icon: 'medication',
    posSector: 'pharmacy',
    shortcuts: [
      'pos',
      'inventory',
      'stock-audit',
      'crm',
      'suppliers',
      'finance',
      'drivers',
      'whatsapp',
      'store-manager',
      'reports',
      'admin-hub',
      'docs'
    ],
    favorites: ['pos', 'inventory', 'crm', 'finance'],
    quickSwitcher: [
      { id: 'pos', label: 'Balcão' },
      { id: 'inventory', label: 'Lotes' },
      { id: 'crm', label: 'Clientes' },
      { id: 'finance', label: 'Caixa' }
    ]
  },
  automotive_services: {
    id: 'automotive_services',
    label: 'Automotivo & Serviços (O.S., Placa, Agenda)',
    shortLabel: 'Auto & Serviços',
    icon: 'car_repair',
    posSector: 'services',
    shortcuts: [
      'pos',
      'services',
      'agenda',
      'calendar',
      'inventory',
      'suppliers',
      'crm',
      'finance',
      'rh',
      'whatsapp',
      'admin-hub',
      'docs'
    ],
    favorites: ['pos', 'services', 'agenda', 'inventory'],
    quickSwitcher: [
      { id: 'pos', label: 'Caixa' },
      { id: 'services', label: 'Ordens O.S.' },
      { id: 'agenda', label: 'Agenda' },
      { id: 'inventory', label: 'Peças' }
    ]
  }
};

export function inferOperationalProfileFromCategory(
  category?: string
): OperationalSegmentProfileId {
  const normalized = (category || '').toLowerCase();
  if (
    normalized.includes('farm') ||
    normalized.includes('drog') ||
    normalized.includes('saúd') ||
    normalized.includes('saud') ||
    normalized.includes('suplement')
  ) {
    return 'pharmacy';
  }
  if (
    normalized.includes('auto') ||
    normalized.includes('oficina') ||
    normalized.includes('servi') ||
    normalized.includes('manuten') ||
    normalized.includes('estética')
  ) {
    return 'automotive_services';
  }
  if (
    normalized.includes('eletro') ||
    normalized.includes('varejo') ||
    normalized.includes('mercado') ||
    normalized.includes('moda') ||
    normalized.includes('informática')
  ) {
    return 'retail_electro';
  }
  return 'restaurant';
}

@Injectable({
  providedIn: 'root'
})
export class OsPreferencesService {
  private readonly notifications = inject(UiNotificationService);
  private activeStorageKey = PREFS_STORAGE_KEY;

  readonly prefs = signal<OSPreferences>(this.loadPrefsFromKey(PREFS_STORAGE_KEY));

  constructor() {
    effect(() => {
      this.saveToStorage(this.prefs());
    });
  }

  /**
   * Scopes desktop preferences per (user, tenant) so each operator/branch retains its own layout
   * and defaults to the branch's operational segment if not customized yet.
   */
  setScope(userIdentifier?: string, tenantId?: string, tenantCategory?: string) {
    const cleanUser = (userIdentifier || 'default').trim().toLowerCase();
    const cleanTenant = (tenantId || 'global').trim();
    const nextKey =
      cleanUser === 'default' && cleanTenant === 'global'
        ? PREFS_STORAGE_KEY
        : `${PREFS_STORAGE_KEY}:${cleanUser}:${cleanTenant}`;

    const inferredProfile = inferOperationalProfileFromCategory(tenantCategory);
    if (this.activeStorageKey === nextKey) {
      if (!this.prefs().customProfileChosen && this.prefs().operationalProfile !== inferredProfile) {
        this.applyOperationalProfile(inferredProfile, true);
      }
      return;
    }

    this.activeStorageKey = nextKey;
    const loaded = this.loadPrefsFromKey(nextKey, inferredProfile);
    this.prefs.set(loaded);
  }

  getActiveProfilePreset(): OperationalProfilePreset {
    return (
      SEGMENT_PROFILE_PRESETS[this.prefs().operationalProfile] ||
      SEGMENT_PROFILE_PRESETS.restaurant
    );
  }

  private loadPrefsFromKey(
    key: string,
    defaultProfile: OperationalSegmentProfileId = 'restaurant'
  ): OSPreferences {
    if (typeof window === 'undefined') return this.getDefaultPrefs(defaultProfile);

    try {
      const saved = localStorage.getItem(key) ?? (key !== PREFS_STORAGE_KEY ? null : null);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<OSPreferences>;
        if (parsed && [1, 2, SCHEMA_VERSION].includes(parsed.version || 0)) {
          const profile: OperationalSegmentProfileId =
            parsed.operationalProfile && SEGMENT_PROFILE_PRESETS[parsed.operationalProfile]
              ? parsed.operationalProfile
              : defaultProfile;
          const preset = SEGMENT_PROFILE_PRESETS[profile];
          return {
            version: SCHEMA_VERSION,
            wallpaper: parsed.wallpaper || 'carbon',
            operationalProfile: profile,
            customProfileChosen: Boolean(parsed.customProfileChosen),
            shortcuts: Array.isArray(parsed.shortcuts) && parsed.shortcuts.length > 0
              ? [...new Set(parsed.shortcuts.map(migrateLegacyAppId).filter((id): id is OSAppId => id !== null))]
              : [...preset.shortcuts],
            favorites: Array.isArray(parsed.favorites) && parsed.favorites.length > 0
              ? [...new Set(parsed.favorites.map(migrateLegacyAppId).filter((id): id is OSAppId => id !== null))]
              : [...preset.favorites],
            workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces.map((workspace) => ({
              ...workspace,
              windows: Array.isArray(workspace.windows) ? migrateWindowIds(workspace.windows) : [],
              activeWinId: migrateLegacyAppId(workspace.activeWinId)
            })) : [],
            currentWorkspaceId: parsed.currentWorkspaceId ?? null,
            sessionWindows: Array.isArray(parsed.sessionWindows) ? migrateWindowIds(parsed.sessionWindows) : undefined,
            sessionActiveWinId: migrateLegacyAppId(parsed.sessionActiveWinId)
          };
        }
      }
    } catch (e) {
      console.error('Failed to load OS preferences', e);
    }

    return this.getDefaultPrefs(defaultProfile);
  }

  private getDefaultPrefs(
    profile: OperationalSegmentProfileId = 'restaurant'
  ): OSPreferences {
    const preset = SEGMENT_PROFILE_PRESETS[profile] || SEGMENT_PROFILE_PRESETS.restaurant;
    return {
      version: SCHEMA_VERSION,
      wallpaper: 'carbon',
      operationalProfile: preset.id,
      customProfileChosen: false,
      shortcuts: [...preset.shortcuts],
      favorites: [...preset.favorites],
      workspaces: [],
      currentWorkspaceId: null
    };
  }

  private saveToStorage(prefs: OSPreferences) {
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.activeStorageKey, JSON.stringify(prefs));
    }
  }

  applyOperationalProfile(profileId: OperationalSegmentProfileId, silent = false) {
    const preset = SEGMENT_PROFILE_PRESETS[profileId];
    if (!preset) return;
    this.prefs.update((p) => ({
      ...p,
      operationalProfile: preset.id,
      customProfileChosen: !silent ? true : p.customProfileChosen,
      shortcuts: [...preset.shortcuts],
      favorites: [...preset.favorites]
    }));
    if (!silent) {
      this.notifications.notify(
        `Perfil Operacional adaptado para ${preset.label}. Atalhos, barra rápida e PDV ajustados!`,
        'success'
      );
    }
  }

  updatePrefs(partial: Partial<OSPreferences>) {
    this.prefs.update((p) => ({ ...p, ...partial }));
  }

  updateWallpaper(wallpaper: OSPreferences['wallpaper']) {
    this.prefs.update((p) => ({ ...p, wallpaper }));
  }

  toggleShortcut(appId: OSAppId) {
    this.prefs.update((p) => {
      const shortcuts = p.shortcuts.includes(appId)
        ? p.shortcuts.filter((id) => id !== appId)
        : [...p.shortcuts, appId];
      return { ...p, shortcuts };
    });
  }

  moveShortcut(appId: OSAppId, direction: 'start' | 'left' | 'right') {
    this.prefs.update((p) => {
      const idx = p.shortcuts.indexOf(appId);
      if (idx === -1) return p;
      const next = [...p.shortcuts];
      if (direction === 'start' && idx > 0) {
        next.splice(idx, 1);
        next.unshift(appId);
      } else if (direction === 'left' && idx > 0) {
        [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
      } else if (direction === 'right' && idx < next.length - 1) {
        [next[idx + 1], next[idx]] = [next[idx]!, next[idx + 1]!];
      }
      return { ...p, shortcuts: next };
    });
  }

  toggleFavorite(appId: OSAppId) {
    this.prefs.update((p) => {
      const favorites = p.favorites.includes(appId)
        ? p.favorites.filter((id) => id !== appId)
        : [...p.favorites, appId];
      return { ...p, favorites };
    });
  }

  saveSessionWindows(windows: OSWindow[], activeWinId: OSAppId | null) {
    this.prefs.update((p) => ({
      ...p,
      sessionWindows: windows.map((w) => ({
        id: w.id,
        title: w.title,
        icon: w.icon,
        isMinimized: w.isMinimized,
        isMaximized: w.isMaximized,
        dockPosition: w.dockPosition,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        zIndex: w.zIndex
      })),
      sessionActiveWinId: activeWinId
    }));
  }

  resetToDefault() {
    const profile = this.prefs().operationalProfile || 'restaurant';
    this.prefs.set(this.getDefaultPrefs(profile));
    this.notifications.notify(
      'Configurações da Área de Trabalho restauradas para o padrão do segmento.',
      'info'
    );
  }

  saveWorkspace(name: string, windows: OSWindow[], activeWinId: OSAppId | null) {
    const id = `ws-${Date.now()}`;
    const newWorkspace: OSWorkspace = {
      id,
      name,
      windows: windows.map((w) => ({
        id: w.id,
        title: w.title,
        icon: w.icon,
        isMinimized: w.isMinimized,
        isMaximized: w.isMaximized,
        dockPosition: w.dockPosition,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        zIndex: w.zIndex
      })),
      activeWinId
    };

    this.prefs.update((p) => ({
      ...p,
      workspaces: [...p.workspaces, newWorkspace],
      currentWorkspaceId: id
    }));
    this.notifications.notify(`Ambiente "${name}" salvo com sucesso!`, 'success');
  }

  setActiveWorkspace(id: string | null) {
    this.prefs.update((p) => ({
      ...p,
      currentWorkspaceId: id
    }));
  }

  deleteWorkspace(id: string) {
    this.prefs.update((p) => ({
      ...p,
      workspaces: p.workspaces.filter((w) => w.id !== id),
      currentWorkspaceId: p.currentWorkspaceId === id ? null : p.currentWorkspaceId
    }));
    this.notifications.notify('Ambiente de trabalho removido.', 'info');
  }
}

