import { env } from '../env.js'

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
}

const EARTH_RADIUS_KM = 6371

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * Builds a universal Google Maps directions link. Coordinates are used for the
 * destination so the link is unambiguous even for identically-named facilities.
 */
export function directionsUrl(
  from: { lat: number; lng: number } | null,
  to: { lat: number; lng: number },
  _label?: string,
): string {
  const params = new URLSearchParams({
    api: '1',
    destination: `${to.lat},${to.lng}`,
    travelmode: 'driving',
  })
  if (from) params.set('origin', `${from.lat},${from.lng}`)
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

interface GooglePlace {
  id?: string
  displayName?: { text?: string }
  formattedAddress?: string
  location?: { latitude?: number; longitude?: number }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  rating?: number
  currentOpeningHours?: { openNow?: boolean }
  primaryType?: string
  types?: string[]
}

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.rating',
  'places.currentOpeningHours.openNow',
  'places.primaryType',
  'places.types',
].join(',')

/** Only genuine care-delivery place types. Pharmacies/labs are excluded. */
const ALLOWED_TYPES = new Set(['hospital', 'doctor', 'medical_clinic', 'health'])
const BLOCKED_TYPES = new Set([
  'pharmacy',
  'drugstore',
  'store',
  'veterinary_care',
  'dentist',
  'spa',
  'beauty_salon',
  'gym',
  'insurance_agency',
  'physiotherapist',
])

function classify(place: GooglePlace): FacilityResult['facility_type'] {
  const name = (place.displayName?.text ?? '').toLowerCase()
  const types = place.types ?? []
  const governmentish =
    /(govt|government|district|civil|general hospital|municipal|sassoon|primary health|phc|chc|rural hospital|community health| esic|railway hospital)/.test(
      name,
    )
  if (/(primary health|phc|sub ?centre|sub ?center|health centre|health center)/.test(name)) return 'phc'
  if (governmentish) return 'government_hospital'
  if (types.includes('hospital')) return 'hospital'
  return 'clinic'
}

function isMedical(place: GooglePlace): boolean {
  const types = place.types ?? []
  if (types.some((t) => BLOCKED_TYPES.has(t))) return false
  if (place.primaryType && ALLOWED_TYPES.has(place.primaryType)) return true
  return types.some((t) => ALLOWED_TYPES.has(t))
}

function toFacility(
  place: GooglePlace,
  origin: { lat: number; lng: number },
): FacilityResult | null {
  const lat = place.location?.latitude
  const lng = place.location?.longitude
  const name = place.displayName?.text
  if (typeof lat !== 'number' || typeof lng !== 'number' || !name) return null
  if (!isMedical(place)) return null

  return {
    id: place.id ?? `${lat},${lng}`,
    name,
    facility_type: classify(place),
    address: place.formattedAddress ?? '',
    latitude: lat,
    longitude: lng,
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? null,
    distance_km: Number(haversineKm(origin, { lat, lng }).toFixed(2)),
    open_now: place.currentOpeningHours?.openNow ?? null,
    rating: typeof place.rating === 'number' ? place.rating : null,
    source: 'google_places',
    maps_url: directionsUrl(origin, { lat, lng }, name),
  }
}

/** Priority order used to sort results for an urgent referral. */
const TYPE_WEIGHT: Record<FacilityResult['facility_type'], number> = {
  government_hospital: 0,
  emergency_facility: 0,
  hospital: 1,
  phc: 2,
  clinic: 3,
}

export async function searchNearby(opts: {
  lat: number
  lng: number
  radiusMeters: number
  urgent: boolean
}): Promise<{ available: boolean; facilities: FacilityResult[]; reason?: string }> {
  if (!env.maps.apiKey) {
    return { available: false, facilities: [], reason: 'GOOGLE_MAPS_API_KEY is not configured' }
  }

  const origin = { lat: opts.lat, lng: opts.lng }
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.maps.apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['hospital', 'doctor'],
      maxResultCount: 20,
      rankPreference: 'DISTANCE',
      locationRestriction: {
        circle: { center: { latitude: opts.lat, longitude: opts.lng }, radius: Math.min(opts.radiusMeters, 50000) },
      },
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Places request failed (${res.status}): ${detail.slice(0, 400)}`)
  }

  const json = (await res.json()) as { places?: GooglePlace[] }
  const facilities = (json.places ?? [])
    .map((p) => toFacility(p, origin))
    .filter((f): f is FacilityResult => f !== null)
    .sort((a, b) =>
      opts.urgent
        ? TYPE_WEIGHT[a.facility_type] - TYPE_WEIGHT[b.facility_type] || a.distance_km - b.distance_km
        : a.distance_km - b.distance_km,
    )
    .slice(0, 8)

  return { available: true, facilities }
}

export async function searchByText(opts: {
  query: string
  lat?: number | null
  lng?: number | null
}): Promise<{ available: boolean; facilities: FacilityResult[]; reason?: string }> {
  if (!env.maps.apiKey) {
    return { available: false, facilities: [], reason: 'GOOGLE_MAPS_API_KEY is not configured' }
  }
  const origin =
    typeof opts.lat === 'number' && typeof opts.lng === 'number'
      ? { lat: opts.lat, lng: opts.lng }
      : null

  const body: Record<string, unknown> = {
    textQuery: `${opts.query} hospital OR primary health centre`,
    maxResultCount: 15,
    includedType: 'hospital',
  }
  if (origin) {
    body.locationBias = { circle: { center: { latitude: origin.lat, longitude: origin.lng }, radius: 50000 } }
  }

  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': env.maps.apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Places text search failed (${res.status}): ${detail.slice(0, 400)}`)
  }

  const json = (await res.json()) as { places?: GooglePlace[] }
  const ref = origin ?? { lat: 0, lng: 0 }
  const facilities = (json.places ?? [])
    .map((p) => toFacility(p, ref))
    .filter((f): f is FacilityResult => f !== null)
    .map((f) => (origin ? f : { ...f, distance_km: 0 }))
    .slice(0, 8)

  return { available: true, facilities }
}
