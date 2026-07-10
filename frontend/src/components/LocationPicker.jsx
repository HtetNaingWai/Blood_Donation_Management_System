import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'

const YANGON_CENTER = [16.8409, 96.1735]
const selectedLocationIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function MapClickHandler({ onSelect }) {
  useMapEvents({
    click(event) {
      const nextLocation = {
        latitude: Number(event.latlng.lat.toFixed(7)),
        longitude: Number(event.latlng.lng.toFixed(7)),
      }

      onSelect(nextLocation)
    },
  })

  return null
}

function MapViewportUpdater({ center }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center)
  }, [center, map])

  return null
}

function LocationPicker({ value, onLocationChange }) {
  const [locationError, setLocationError] = useState('')

  // Keep the map focused on Yangon until the user selects or shares a location.
  const center = useMemo(() => {
    if (value?.latitude && value?.longitude) {
      return [value.latitude, value.longitude]
    }

    return YANGON_CENTER
  }, [value?.latitude, value?.longitude])

  async function handleUseCurrentLocation() {
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        onLocationChange({
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location access was denied. Please allow permission or choose a point on the map.')
          return
        }

        if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError('Your current location is unavailable right now. Please try again or click the map.')
          return
        }

        if (error.code === error.TIMEOUT) {
          setLocationError('Location request timed out. Please try again or click the map.')
          return
        }

        setLocationError('Unable to get your current location. Please click the map to continue.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    )
  }

  return (
    <div className="location-picker">
      <div className="location-picker__actions">
        <button
          type="button"
          className="location-picker__button"
          onClick={handleUseCurrentLocation}
        >
          Use Current Location
        </button>
        <p className="location-picker__hint">
          Click the map to place your donor location.
        </p>
      </div>

      <div className="location-picker__map">
        <MapContainer center={center} zoom={13} scrollWheelZoom className="location-picker__map-frame">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapViewportUpdater center={center} />
          <MapClickHandler onSelect={onLocationChange} />
          {value?.latitude && value?.longitude ? (
            <Marker position={[value.latitude, value.longitude]} icon={selectedLocationIcon} />
          ) : null}
        </MapContainer>
      </div>

      <div className="location-picker__status">
        <p>
          <strong>Selected Latitude:</strong>{' '}
          {value?.latitude ?? 'Not selected'}
        </p>
        <p>
          <strong>Selected Longitude:</strong>{' '}
          {value?.longitude ?? 'Not selected'}
        </p>
      </div>

      {locationError ? <p className="location-picker__error">{locationError}</p> : null}
    </div>
  )
}

export default LocationPicker
