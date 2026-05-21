import { useEffect, useState } from 'react'

import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

import 'leaflet/dist/leaflet.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { davaoCityCenter } from '../../data/map'
import type { BookingLocationField, MapLocation } from '../../types/app'
import { formatPinnedLocation, resolvePinnedLocation, searchLocationByAddress } from '../../utils/location'

let leafletIconsInitialized = false

function initializeLeafletIcons() {
  if (leafletIconsInitialized) {
    return
  }

  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })

  leafletIconsInitialized = true
}

initializeLeafletIcons()

export function LocationMapModal({
  field,
  initialLocation,
  initialQuery,
  onCancel,
  onConfirm,
}: {
  field: BookingLocationField
  initialLocation: MapLocation | null
  initialQuery: string
  onCancel: () => void
  onConfirm: (location: MapLocation) => void
}) {
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null,
  )
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    initialLocation ? initialLocation.label : null,
  )
  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [isSaving, setIsSaving] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Click the map to pin a location.')

  useEffect(() => {
    setSelectedPoint(initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null)
    setSelectedLabel(initialLocation ? initialLocation.label : null)
    setSearchQuery(initialQuery)
    setStatusMessage('Click the map to pin a location.')
    setIsSaving(false)
    setIsSearching(false)
  }, [field, initialLocation, initialQuery])

  const center: [number, number] = initialLocation
    ? [initialLocation.lat, initialLocation.lng]
    : davaoCityCenter

  const performSearch = async () => {
    const query = searchQuery.trim()

    if (!query || isSearching) {
      return
    }

    setIsSearching(true)
    setStatusMessage('Searching address...')

    try {
      const location = await searchLocationByAddress(query)
      setSelectedPoint({ lat: location.lat, lng: location.lng })
      setSelectedLabel(location.label)
      setStatusMessage('Address pinned on the map.')
    } catch {
      setStatusMessage('No matching address found. Try a different search.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedPoint || isSaving) {
      return
    }

    setIsSaving(true)
    setStatusMessage('Resolving location...')

    try {
      const label = selectedLabel ?? (await resolvePinnedLocation(selectedPoint.lat, selectedPoint.lng))
      onConfirm({ ...selectedPoint, label })
    } catch {
      onConfirm({
        ...selectedPoint,
        label: formatPinnedLocation(selectedPoint.lat, selectedPoint.lng),
      })
    }
  }

  return (
    <div className="location-map-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="location-map-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-map-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="location-map-header">
          <div>
            <h3 id="location-map-title">
              Select {field === 'pickup' ? 'Pick-up' : 'Drop-off'} Location
            </h3>
            <p>{statusMessage}</p>
          </div>
          <button type="button" className="link-button subtle-link" onClick={onCancel}>
            Close
          </button>
        </div>

        <form
          className="location-search-bar"
          onSubmit={(event) => {
            event.preventDefault()
            void performSearch()
          }}
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search address and pin it on the map"
            aria-label="Search address"
          />
          <button type="submit" className="primary-pill" disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        <div className="location-map-stage">
          <MapContainer center={center} zoom={9} scrollWheelZoom className="booking-map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              onPick={(point) => {
                setSelectedPoint(point)
                setSelectedLabel(null)
                setStatusMessage('Location pinned from the map.')
              }}
            />
            <MapViewFocus point={selectedPoint} />
            {selectedPoint && <Marker position={[selectedPoint.lat, selectedPoint.lng]} />}
          </MapContainer>
        </div>

        <div className="location-map-summary">
          <span>
            {selectedLabel ??
              (selectedPoint ? formatPinnedLocation(selectedPoint.lat, selectedPoint.lng) : 'No pin selected yet')}
          </span>
        </div>

        <div className="modal-actions">
          <button type="button" className="primary-pill cancel-pill" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-pill confirm-pill"
            onClick={handleConfirm}
            disabled={!selectedPoint || isSaving}
          >
            {isSaving ? 'Saving...' : 'Use pinned location'}
          </button>
        </div>
      </section>
    </div>
  )
}

function MapClickHandler({
  onPick,
}: {
  onPick: (point: { lat: number; lng: number }) => void
}) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return null
}

function MapViewFocus({ point }: { point: { lat: number; lng: number } | null }) {
  const map = useMap()

  useEffect(() => {
    if (point) {
      map.setView([point.lat, point.lng], 12, { animate: true })
    }
  }, [map, point])

  return null
}
