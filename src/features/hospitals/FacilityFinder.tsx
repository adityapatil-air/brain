import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle,
  Building2,
  Check,
  ExternalLink,
  Navigation,
  Phone,
  Search,
  Siren,
  Crosshair,
} from 'lucide-react'
import { useI18n, useLabels } from '../../i18n/I18nProvider'
import { repo } from '../../services/data'
import {
  GeolocationError,
  MapsService,
  directionsUrl,
  mapsSearchUrl,
  type Coordinates,
  type FacilityResult,
} from '../../services/maps/MapsService'
import { Badge } from '../../components/ui/Badge'
import { Button, ExternalButtonLink } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { TextInput } from '../../components/ui/Field'
import { EmptyState, LoadingState, Notice } from '../../components/ui/States'
import { formatDistance } from '../../utils/format'
import { cn } from '../../utils/cn'

type Phase = 'idle' | 'locating' | 'searching' | 'ready'

export function FacilityCard({
  facility,
  origin,
  selected,
  onSelect,
}: {
  facility: FacilityResult
  origin: Coordinates | null
  selected: boolean
  onSelect?: (facility: FacilityResult) => void
}) {
  const { t } = useI18n()
  const labels = useLabels()
  const url = facility.maps_url || directionsUrl(origin, { lat: facility.latitude, lng: facility.longitude })
  const priority = facility.facility_type === 'government_hospital' || facility.facility_type === 'emergency_facility'

  return (
    <div
      className={cn(
        'rounded-2xl border bg-surface p-4 transition-shadow',
        selected ? 'border-care-600 ring-1 ring-care-600' : 'border-ink-100 hover:shadow-raised',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            priority ? 'bg-risk-redSoft text-risk-red' : 'bg-care-50 text-care-600',
          )}
        >
          {priority ? <Siren className="h-5 w-5" aria-hidden /> : <Building2 className="h-5 w-5" aria-hidden />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="min-w-0 text-[0.9375rem] font-semibold leading-snug text-ink-900">
              {facility.name}
            </h3>
            {facility.distance_km > 0 && (
              <span className="tabular shrink-0 text-sm font-semibold text-care-700">
                {formatDistance(facility.distance_km)}
              </span>
            )}
          </div>

          {facility.address && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">{facility.address}</p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <Badge tone={priority ? 'red' : 'neutral'}>{labels.facilityType(facility.facility_type)}</Badge>
            {facility.has_emergency && <Badge tone="amber">{t('facility.hasEmergency')}</Badge>}
            {facility.open_now === true && <Badge tone="green">{t('facility.openNow')}</Badge>}
            {facility.open_now === false && <Badge tone="neutral">{t('facility.closedNow')}</Badge>}
            <Badge tone="info">
              {facility.source === 'google_places'
                ? t('facility.source.google_places')
                : t('facility.source.directory')}
            </Badge>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-2">
            <ExternalButtonLink
              href={url}
              size="sm"
              variant={priority ? 'urgent' : 'primary'}
              iconLeft={<Navigation className="h-3.5 w-3.5" aria-hidden />}
            >
              {t('facility.directions')}
            </ExternalButtonLink>

            {facility.phone && (
              <a
                href={`tel:${facility.phone.replace(/\s/g, '')}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ink-200 bg-surface px-3 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {t('facility.call')}
              </a>
            )}

            {onSelect && (
              <Button
                size="sm"
                variant={selected ? 'secondary' : 'outline'}
                onClick={() => onSelect(facility)}
                iconLeft={selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : undefined}
              >
                {selected ? t('facility.selected') : t('facility.select')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function FacilityFinder({
  urgent,
  selected,
  onSelect,
  memberLocation,
}: {
  urgent: boolean
  selected: FacilityResult | null
  onSelect: (facility: FacilityResult) => void
  /** Fallback origin (the member's recorded home coordinates). */
  memberLocation?: Coordinates | null
}) {
  const { t } = useI18n()

  const [phase, setPhase] = useState<Phase>('idle')
  const [origin, setOrigin] = useState<Coordinates | null>(null)
  const [facilities, setFacilities] = useState<FacilityResult[]>([])
  const [geoError, setGeoError] = useState<string | null>(null)
  const [placesUnavailable, setPlacesUnavailable] = useState(false)
  const [query, setQuery] = useState('')

  const loadFor = useCallback(
    async (coords: Coordinates | null, textQuery?: string) => {
      setPhase('searching')
      setPlacesUnavailable(false)

      let live: { available: boolean; facilities: FacilityResult[] } = {
        available: false,
        facilities: [],
      }
      if (textQuery?.trim()) {
        live = await MapsService.searchByText(textQuery.trim(), coords)
      } else if (coords) {
        live = await MapsService.searchNearby(coords, { urgent })
      }

      if (live.available && live.facilities.length > 0) {
        setFacilities(live.facilities)
        setPhase('ready')
        return
      }

      // Fall back to the curated directory in the database. These are real
      // records — nothing is invented.
      setPlacesUnavailable(true)
      try {
        const directory = await repo.listFacilities()
        setFacilities(
          MapsService.fromDirectory(directory, coords, { urgent, query: textQuery?.trim() }),
        )
      } catch {
        setFacilities([])
      }
      setPhase('ready')
    },
    [urgent],
  )

  const locate = useCallback(async () => {
    setGeoError(null)
    setPhase('locating')
    try {
      const coords = await MapsService.getCurrentPosition()
      setOrigin(coords)
      await loadFor(coords)
    } catch (err) {
      const code = err instanceof GeolocationError ? err.code : 'UNAVAILABLE'
      setGeoError(code === 'DENIED' ? t('facility.locationDenied') : t('facility.locationDenied'))
      // Still show something useful, anchored on the member's home if known.
      setOrigin(memberLocation ?? null)
      await loadFor(memberLocation ?? null)
    }
  }, [loadFor, memberLocation, t])

  // For an urgent referral, ask for location straight away — every second
  // spent tapping buttons matters.
  useEffect(() => {
    if (urgent && phase === 'idle') void locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urgent])

  return (
    <Card className={urgent ? 'border-risk-redBorder' : undefined}>
      <CardHeader
        title={t('facility.title')}
        description={t('facility.subtitle')}
        icon={<Navigation className="h-4 w-4" aria-hidden />}
        action={
          phase !== 'locating' && phase !== 'searching' ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void locate()}
              iconLeft={<Crosshair className="h-3.5 w-3.5" aria-hidden />}
            >
              {t('facility.useLocation')}
            </Button>
          ) : undefined
        }
      />
      <CardBody className="space-y-4">
        {geoError && (
          <Notice tone="amber" icon={<AlertCircle className="h-4 w-4" aria-hidden />}>
            <span className="font-semibold">{geoError}</span>{' '}
            <span>{t('facility.locationDeniedHint')}</span>
          </Notice>
        )}

        {placesUnavailable && phase === 'ready' && (
          <Notice
            tone="info"
            icon={<AlertCircle className="h-4 w-4" aria-hidden />}
            action={
              <ExternalButtonLink
                href={mapsSearchUrl('hospital', origin)}
                size="sm"
                variant="secondary"
                iconLeft={<ExternalLink className="h-3.5 w-3.5" aria-hidden />}
              >
                {t('facility.openInMaps')}
              </ExternalButtonLink>
            }
          >
            {t('facility.unavailable')}
          </Notice>
        )}

        {/* Manual search always available, not just after a failure. */}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void loadFor(origin, query)
          }}
        >
          <div className="min-w-[12rem] flex-1">
            <TextInput
              label={t('facility.searchManual')}
              placeholder={t('facility.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              iconLeft={<Search className="h-4 w-4" aria-hidden />}
            />
          </div>
          <Button type="submit" size="md" variant="secondary" disabled={query.trim().length < 2}>
            {t('common.search')}
          </Button>
        </form>

        {phase === 'locating' && <LoadingState label={t('facility.locating')} className="py-8" />}
        {phase === 'searching' && <LoadingState label={t('facility.searching')} className="py-8" />}

        {phase === 'idle' && (
          <EmptyState
            icon={<Navigation className="h-6 w-6" aria-hidden />}
            title={t('facility.useLocation')}
            description={t('facility.subtitle')}
            action={
              <Button onClick={() => void locate()} iconLeft={<Crosshair className="h-4 w-4" aria-hidden />}>
                {t('facility.useLocation')}
              </Button>
            }
          />
        )}

        {phase === 'ready' &&
          (facilities.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" aria-hidden />}
              title={t('facility.empty')}
              description={t('facility.emptyHint')}
              action={
                <ExternalButtonLink
                  href={mapsSearchUrl(query.trim() || 'hospital', origin)}
                  variant="secondary"
                  iconLeft={<ExternalLink className="h-4 w-4" aria-hidden />}
                >
                  {t('facility.openInMaps')}
                </ExternalButtonLink>
              }
            />
          ) : (
            <ul className="space-y-3">
              {facilities.map((f) => (
                <li key={f.id}>
                  <FacilityCard
                    facility={f}
                    origin={origin}
                    selected={selected?.id === f.id}
                    onSelect={onSelect}
                  />
                </li>
              ))}
            </ul>
          ))}
      </CardBody>
    </Card>
  )
}
