import type { HealthcareFacility } from '../../types/domain'

export interface Coordinates {
  lat: number
  lng: number
}

export interface FacilityResult {
  id: string
  name: string
  facility_type: 'hospital' | 'phc' | 'government_hospital' | 'emergency_facility' | 'clinic'
  address: string
  latitude: number
  longitude: number
  phone: string | null
  distance_km: number
  open_now: boolean | null
  rating: number | null
  source: 'google_places' | 'directory'
  maps_url: string
  has_emergency?: boolean
}

export type GeolocationErrorCode = 'DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED'

export class GeolocationError extends Error {
  constructor(public readonly code: GeolocationErrorCode) {
    super(code)
    this.name = 'GeolocationError'
  }
}

export function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

/** Universal Google Maps directions link — works on web, Android and iOS. */
export function directionsUrl(from: Coordinates | null, to: Coordinates): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${to.lat},${to.lng}`,
    travelmode: 'driving',
  })
  if (from) params.set('origin', `${from.lat},${from.lng}`)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

/** Fallback link when the Places API is unavailable. */
export function mapsSearchUrl(query: string, near?: Coordinates | null): string {
  const params = new URLSearchParams({ api: '1', query })
  if (near) params.set('query', `${query} near ${near.lat},${near.lng}`)
  return `https://www.google.com/maps/search/?${params.toString()}`
}

const TYPE_WEIGHT: Record<FacilityResult['facility_type'], number> = {
  government_hospital: 0,
  emergency_facility: 0,
  hospital: 1,
  phc: 2,
  clinic: 3,
}

export const MapsService = {
  getCurrentPosition(timeoutMs = 12000): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        reject(new GeolocationError('UNSUPPORTED'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) reject(new GeolocationError('DENIED'))
          else if (err.code === err.TIMEOUT) reject(new GeolocationError('TIMEOUT'))
          else reject(new GeolocationError('UNAVAILABLE'))
        },
        { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
      )
    })
  },

  /**
   * Live nearby search through the server-side Places proxy.
   * Returns `available: false` when no Google key is configured, so the caller
   * can fall back to the curated facility directory.
   */
  async searchNearby(
    origin: Coordinates,
    opts: { urgent: boolean; radiusMeters?: number },
  ): Promise<{ available: boolean; facilities: FacilityResult[] }> {
    try {
      const res = await fetch('/api/places/nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: origin.lat,
          lng: origin.lng,
          radiusMeters: opts.radiusMeters ?? 15000,
          urgent: opts.urgent,
        }),
      })
      if (!res.ok) return { available: false, facilities: [] }
      return (await res.json()) as { available: boolean; facilities: FacilityResult[] }
    } catch {
      return { available: false, facilities: [] }
    }
  },

  async searchByText(
    query: string,
    origin: Coordinates | null,
  ): Promise<{ available: boolean; facilities: FacilityResult[] }> {
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, lat: origin?.lat ?? null, lng: origin?.lng ?? null }),
      })
      if (!res.ok) return { available: false, facilities: [] }
      return (await res.json()) as { available: boolean; facilities: FacilityResult[] }
    } catch {
      return { available: false, facilities: [] }
    }
  },

  /**
   * Ranks the curated directory against a location. Used when Google Places is
   * not configured or returns nothing — the facilities are real records from
   * the database rather than invented results.
   */
  fromDirectory(
    facilities: HealthcareFacility[],
    origin: Coordinates | null,
    opts: { urgent: boolean; query?: string },
  ): FacilityResult[] {
    const q = opts.query?.trim().toLowerCase()
    return facilities
      .filter((f) =>
        q ? `${f.name} ${f.address ?? ''} ${f.district ?? ''}`.toLowerCase().includes(q) : true,
      )
      .map<FacilityResult>((f) => ({
        id: f.id,
        name: f.name,
        facility_type: f.facility_type,
        address: f.address ?? '',
        latitude: f.latitude,
        longitude: f.longitude,
        phone: f.phone,
        distance_km: origin
          ? Number(haversineKm(origin, { lat: f.latitude, lng: f.longitude }).toFixed(2))
          : 0,
        open_now: null,
        rating: null,
        source: 'directory',
        maps_url: directionsUrl(origin, { lat: f.latitude, lng: f.longitude }),
        has_emergency: f.has_emergency,
      }))
      .sort((a, b) =>
        opts.urgent
          ? TYPE_WEIGHT[a.facility_type] - TYPE_WEIGHT[b.facility_type] || a.distance_km - b.distance_km
          : a.distance_km - b.distance_km,
      )
      .slice(0, 8)
  },
}
