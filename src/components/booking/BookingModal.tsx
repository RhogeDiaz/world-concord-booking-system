import { useEffect, useState } from 'react'

import { api } from '../../api/client'
import type { BookingLocationField, BookingLocationInputs, MapLocation } from '../../types/app'
import { LocationMapModal } from './LocationMapModal'

type Port = {
  id: number
  port_name: string
}

function MapPinIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 2c-3.31 0-6 2.69-6 6 0 4.42 6 14 6 14s6-9.58 6-14c0-3.31-2.69-6-6-6Zm0 8.5A2.5 2.5 0 1 1 12 5a2.5 2.5 0 0 1 0 5.5Z" />
    </svg>
  )
}

export function BookingModal({
  onClose,
  bookingLocations,
  bookingLocationInputs,
  activeLocationField,
  onOpenLocationPicker,
  onCloseLocationPicker,
  onLocationSelect,
  onLocationInputChange,
  onBooked,
}: {
  onClose: () => void
  bookingLocations: Record<BookingLocationField, MapLocation | null>
  bookingLocationInputs: BookingLocationInputs
  activeLocationField: BookingLocationField | null
  onOpenLocationPicker: (field: BookingLocationField) => void
  onCloseLocationPicker: () => void
  onLocationSelect: (field: BookingLocationField, location: MapLocation) => void
  onLocationInputChange: (field: BookingLocationField, value: string) => void
  onBooked?: () => Promise<void> | void
}) {
  const [containerSizes, setContainerSizes] = useState({
    20: 0,
    40: 0,
  })
  const [goodsTypeId, setGoodsTypeId] = useState<0 | 1>(1)
  const [pickupDate, setPickupDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [ports, setPorts] = useState<Port[]>([])
  const [destinationPort, setDestinationPort] = useState('')
  const [departurePort, setDeparturePort] = useState('')

  useEffect(() => {
    const loadPorts = async () => {
      try {
        const portRows = await api.getPorts()
        setPorts(portRows || [])
        if (portRows?.length > 0) {
          setDeparturePort((current) => current || String(portRows[0].id))
          setDestinationPort((current) => current || String(portRows[Math.min(1, portRows.length - 1)].id))
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load ports', error)
      }
    }

    loadPorts()
  }, [])

  const updateContainerSize = (size: 20 | 40, delta: number) => {
    setContainerSizes((currentSizes) => ({
      ...currentSizes,
      [size]: Math.max(0, currentSizes[size] + delta),
    }))
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setSubmitError('')

      await api.createBooking({
        pickup_location: bookingLocationInputs.pickup || undefined,
        dropoff_location: bookingLocationInputs.dropoff || undefined,
        // send pickup_date as date-only string to avoid timezone shifting on the server
        pickup_date: pickupDate || undefined,
        container_20: containerSizes[20],
        container_40: containerSizes[40],
        type_of_goods_id: goodsTypeId,
        destination_port: destinationPort ? Number(destinationPort) : undefined,
        departure_port: departurePort ? Number(departurePort) : undefined,
      })

      if (onBooked) {
        await onBooked()
      }
      onClose()
    } catch (error: any) {
      setSubmitError(error.message || 'Failed to submit booking')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="booking-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="booking-title">Booking</h2>
        <div className="modal-fields">
          <label className="field location-field">
            <span>Pick-up Location</span>
            <div className="location-input-row">
              <input
                value={bookingLocationInputs.pickup}
                onChange={(event) => onLocationInputChange('pickup', event.target.value)}
                placeholder="Select a pin on the map or type an address"
              />
              <button
                type="button"
                className="map-icon-button"
                aria-label="Open map for pick-up location"
                onClick={() => onOpenLocationPicker('pickup')}
              >
                <MapPinIcon />
              </button>
            </div>
          </label>
          <label className="field">
            <span>Day of Pick-up</span>
            <input type="date" value={pickupDate} onChange={(event) => setPickupDate(event.target.value)} />
          </label>
          <label className="field">
            <span>Departure Port</span>
            <select value={departurePort} onChange={(event) => setDeparturePort(event.target.value)}>
              {ports.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.port_name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Destination Port</span>
            <select value={destinationPort} onChange={(event) => setDestinationPort(event.target.value)}>
              {ports.map((port) => (
                <option key={port.id} value={port.id}>
                  {port.port_name}
                </option>
              ))}
            </select>
          </label>
          <div className="field">
            <span>Container Size</span>
            <div className="container-size-grid" role="group" aria-label="Container sizes">
              {[20, 40].map((size) => (
                <section className="container-size-card" key={size}>
                  <button
                    type="button"
                    className={`size-badge${containerSizes[size as 20 | 40] > 0 ? ' size-badge-active' : ''}`}
                    aria-pressed={containerSizes[size as 20 | 40] > 0}
                    onClick={() => updateContainerSize(size as 20 | 40, 1)}
                  >
                    {size}
                  </button>
                  <div className="quantity-stepper" aria-label={`${size} quantity controls`}>
                    <button
                      type="button"
                      className="stepper-button stepper-decrement"
                      aria-label={`Decrease ${size} quantity`}
                      onClick={() => updateContainerSize(size as 20 | 40, -1)}
                    >
                      -
                    </button>
                    <span className="quantity-value">{containerSizes[size as 20 | 40]}</span>
                    <button
                      type="button"
                      className="stepper-button stepper-increment"
                      aria-label={`Increase ${size} quantity`}
                      onClick={() => updateContainerSize(size as 20 | 40, 1)}
                    >
                      +
                    </button>
                  </div>
                </section>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Type of Goods</span>
            <select
              className="goods-select"
              value={goodsTypeId}
              onChange={(event) => setGoodsTypeId(Number(event.target.value) as 0 | 1)}
            >
              <option value={1}>perishable</option>
              <option value={0}>non-perishable</option>
            </select>
          </label>
          <label className="field location-field">
            <span>Drop-off Location</span>
            <div className="location-input-row">
              <input
                value={bookingLocationInputs.dropoff}
                onChange={(event) => onLocationInputChange('dropoff', event.target.value)}
                placeholder="Select a pin on the map or type an address"
              />
              <button
                type="button"
                className="map-icon-button"
                aria-label="Open map for drop-off location"
                onClick={() => onOpenLocationPicker('dropoff')}
              >
                <MapPinIcon />
              </button>
            </div>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="primary-pill cancel-pill" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-pill confirm-pill" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Confirm'}
          </button>
        </div>
        {submitError ? <p className="auth-error" style={{ marginTop: '12px' }}>{submitError}</p> : null}
      </section>
      {activeLocationField && (
        <LocationMapModal
          field={activeLocationField}
          initialLocation={bookingLocations[activeLocationField]}
          initialQuery={bookingLocationInputs[activeLocationField]}
          onCancel={onCloseLocationPicker}
          onConfirm={(location) => {
            onLocationSelect(activeLocationField, location)
            onCloseLocationPicker()
          }}
        />
      )}
    </div>
  )
}
