import { Injectable } from '@angular/core';

type LeafletApi = typeof import('leaflet');
type MaplibreLeafletFactory = typeof import('@maplibre/maplibre-gl-leaflet').maplibreGL;

export interface MapLibraries {
  leaflet: LeafletApi;
  maplibreGL: MaplibreLeafletFactory;
}

@Injectable({ providedIn: 'root' })
export class MapProviderService {
  private librariesPromise: Promise<MapLibraries> | null = null;

  load(): Promise<MapLibraries> {
    if (!this.librariesPromise) {
      this.librariesPromise = Promise.all([
        import('leaflet'),
        import('maplibre-gl'),
        import('@maplibre/maplibre-gl-leaflet')
      ]).then(([leafletModule, maplibre, adapter]) => {
        maplibre.setWorkerUrl(new URL('assets/maplibre/maplibre-gl-worker.mjs', document.baseURI).href);
        return {
          leaflet: leafletModule.default,
          maplibreGL: adapter.maplibreGL
        };
      }).catch((error: unknown) => {
        this.librariesPromise = null;
        throw error;
      });
    }

    return this.librariesPromise;
  }

  addBaseLayer(maplibreGL: MapLibraries['maplibreGL'], map: import('leaflet').Map) {
    maplibreGL({ style: 'https://tiles.openfreemap.org/styles/liberty' }).addTo(map);
    map.attributionControl?.addAttribution(
      '<a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">© OpenMapTiles</a> · Dados de <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap</a>'
    );
  }
}
