import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'

const defaultMapCenter = [16.8409, 96.1735]

const hospitalMarkerIcon = L.divIcon({
  className: 'donor-map__icon-wrap donor-map__icon-wrap--hospital',
  html: '<div class="donor-map__icon donor-map__icon--hospital" aria-hidden="true">🏥</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -30],
})

const currentLocationIcon = L.divIcon({
  className: 'donor-map__icon-wrap donor-map__icon-wrap--current',
  html: '<div class="donor-map__icon donor-map__icon--current" aria-hidden="true">👤</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -30],
})

function directionUrl(latitude, longitude) {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
}

function MapViewportSync({ center }) {
  const map = useMap()

  useEffect(() => {
    // Keep the visible map area aligned with either Yangon or the donor's selected browser location.
    map.setView(center)
  }, [center, map])

  return null
}

function SearchHospital({
  hospitals,
  hospitalsLoading,
  locationLoading,
  locationMessage,
  mapCenter,
  currentLocation,
  onUseMyLocation,
  onRefreshHospitals,
}) {
  const visibleHospitals = hospitals || []
  const hasHospitalLocations = visibleHospitals.length > 0

  return (
    <section className="donor-requests-page">
      <section className="donor-panel">
        <div className="donor-panel__header">
          <div>
            <h2>Approved Hospital Map</h2>
            <p>Find approved hospitals and open directions before you travel to donate.</p>
          </div>
          <div className="donor-search-hospitals__actions">
            <button type="button" onClick={onUseMyLocation}>
              {locationLoading ? 'Locating...' : 'Use My Location'}
            </button>
            <button type="button" onClick={onRefreshHospitals}>
              {hospitalsLoading ? 'Refreshing...' : 'Refresh Hospitals'}
            </button>
          </div>
        </div>

        {locationMessage ? <p className="donor-profile__message">{locationMessage}</p> : null}
        {!hasHospitalLocations ? <p className="donor-profile__message">No approved hospital locations found.</p> : null}

        <div className="donor-map">
          <MapContainer center={mapCenter || defaultMapCenter} zoom={12} scrollWheelZoom className="donor-map__frame">
            <MapViewportSync center={mapCenter || defaultMapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* The hospital list table was removed intentionally, but hospital data is still used here for map markers. */}
            {visibleHospitals.map((hospital) => (
              hospital.latitude && hospital.longitude ? (
                <Marker
                  key={hospital.id || hospital.license_number || hospital.hospital_name}
                  position={[hospital.latitude, hospital.longitude]}
                  icon={hospitalMarkerIcon}
                >
                  <Popup>
                    <strong>{hospital.hospital_name}</strong>
                    <br />
                    {hospital.address}
                    <br />
                    {hospital.phone ? `Phone: ${hospital.phone}` : 'Phone: Not available'}
                    <br />
                    {hospital.approval_status ? `Status: ${hospital.approval_status}` : 'Status: approved'}
                    <br />
                    <a
                      href={directionUrl(hospital.latitude, hospital.longitude)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Route
                    </a>
                  </Popup>
                </Marker>
              ) : null
            ))}
            {/* Keep the donor's current browser location separate from hospital markers for clarity. */}
            {currentLocation ? (
              <Marker
                position={[currentLocation.latitude, currentLocation.longitude]}
                icon={currentLocationIcon}
              >
                <Popup>
                  <strong>Your Location</strong>
                  <br />
                  This marker shows your current browser location.
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>
        </div>
      </section>
    </section>
  )
}

export default SearchHospital
