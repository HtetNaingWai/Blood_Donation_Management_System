import L from 'leaflet'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'

const hospitalMarkerIcon = L.divIcon({
  className: 'donor-map__marker-wrap',
  html: '<div class="donor-map__marker donor-map__marker--hospital">✚</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

const donorMarkerIcon = L.divIcon({
  className: 'donor-map__marker-wrap',
  html: '<div class="donor-map__marker donor-map__marker--donor">🩸</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

// Leaflet map for visualizing the hospital and nearby donors in one place.
function DonorMap({ hospital, donors }) {
  const center = [hospital.latitude, hospital.longitude]

  return (
    <section className="hospital-search-donors__map hospital-panel">
      <div className="hospital-panel__header">
        <h2>Donor Map</h2>
        <p>Hospital and donor locations using the current shared map setup.</p>
      </div>

      <div className="hospital-search-donors__map-frame">
        <MapContainer center={center} zoom={12} scrollWheelZoom className="hospital-search-donors__leaflet">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={center} icon={hospitalMarkerIcon}>
            <Popup>
              <strong>{hospital.name}</strong>
              <br />
              Hospital location
            </Popup>
          </Marker>

          {donors.map((donor) => (
            donor.latitude && donor.longitude ? (
              <Marker key={donor.id} position={[donor.latitude, donor.longitude]} icon={donorMarkerIcon}>
                <Popup>
                  <strong>{donor.name}</strong>
                  <br />
                  {donor.bloodGroup} • {donor.distanceLabel}
                </Popup>
              </Marker>
            ) : null
          ))}
        </MapContainer>
      </div>
    </section>
  )
}

export default DonorMap
