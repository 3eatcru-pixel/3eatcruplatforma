import { Injectable } from '@angular/core';

export interface MapCoord {
  lat: number;
  lng: number;
}

export interface MapDistanceResult {
  km: number;
  meters: number;
  miles: number;
}

@Injectable({
  providedIn: 'root'
})
export class MapToolsService {
  /**
   * Calculates the distance between two points using the Haversine formula.
   */
  calculateDistance(p1: MapCoord, p2: MapCoord): MapDistanceResult {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(p2.lat - p1.lat);
    const dLng = this.deg2rad(p2.lng - p1.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(p1.lat)) * Math.cos(this.deg2rad(p2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const km = R * c;

    return {
      km,
      meters: km * 1000,
      miles: km * 0.621371
    };
  }

  /**
   * Calculates the area of a polygon defined by an array of coordinates.
   * Using the Shoelace formula (simplified for small areas on a plane).
   */
  calculateArea(coords: MapCoord[]): number {
    if (coords.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      area += coords[i].lat * coords[j].lng;
      area -= coords[j].lat * coords[i].lng;
    }
    
    // Convert to approx square meters (this is a rough estimate for small areas)
    // 1 degree of latitude is ~111km
    // 1 degree of longitude is ~111km * cos(lat)
    const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
    const latFactor = 111320;
    const lngFactor = 111320 * Math.cos(this.deg2rad(avgLat));
    
    return Math.abs(area) * 0.5 * latFactor * lngFactor;
  }

  /**
   * Converts coordinates to different formats (DMS, etc.)
   */
  toDMS(coord: number, isLat: boolean): string {
    const absolute = Math.abs(coord);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    
    let direction = '';
    if (isLat) {
      direction = coord >= 0 ? 'N' : 'S';
    } else {
      direction = coord >= 0 ? 'E' : 'W';
    }
    
    return `${degrees}°${minutes}'${seconds}" ${direction}`;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
