import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Rider } from '../types';

interface AdminFleetMapProps {
  riders: Rider[];
  onSelectRider?: (rider: Rider) => void;
}

const BRYBOS_HQ: [number, number] = [6.4312, 3.4245];

export default function AdminFleetMap({ riders, onSelectRider }: AdminFleetMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkersRef = useRef<Map<string | number, L.Marker>>(new Map());

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: BRYBOS_HQ,
      zoom: 13,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | Brybos Fleet Ops',
      maxZoom: 19,
    }).addTo(map);

    // Restaurant HQ Marker
    const hqIcon = L.divIcon({
      className: 'custom-hq-pin',
      html: `
        <div style="
          background: #11141a;
          border: 2px solid #C89B3C;
          color: #C89B3C;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
        ">🍽️</div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    L.marker(BRYBOS_HQ, { icon: hqIcon })
      .addTo(map)
      .bindPopup(`<strong>Brybos Kitchen HQ</strong><br/>Central Operations & Kitchen Hub`)
      .openPopup();

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update rider markers when riders change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear removed markers
    riderMarkersRef.current.forEach((marker, id) => {
      if (!riders.some((r) => r.id === id)) {
        marker.remove();
        riderMarkersRef.current.delete(id);
      }
    });

    // Add or update rider markers
    riders.forEach((rider, idx) => {
      // Use rider lat/lng or realistic spread around HQ
      const defaultOffsets = [
        [0.012, 0.015],
        [-0.014, 0.02],
        [0.018, -0.016],
        [-0.01, -0.018],
      ];
      const offset = defaultOffsets[idx % defaultOffsets.length];
      const lat = rider.lat || BRYBOS_HQ[0] + offset[0];
      const lng = rider.lng || BRYBOS_HQ[1] + offset[1];
      const isBusy = rider.availability === 'busy';

      const riderIcon = L.divIcon({
        className: 'custom-fleet-pin',
        html: `
          <div style="
            background: ${isBusy ? '#C89B3C' : '#28a745'};
            border: 2px solid #ffffff;
            color: ${isBusy ? '#11141a' : '#ffffff'};
            width: 38px;
            height: 38px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            box-shadow: 0 0 14px ${isBusy ? 'rgba(200,155,60,0.8)' : 'rgba(40,167,69,0.7)'};
            ${isBusy ? 'animation: pulse 1.8s infinite;' : ''}
          ">🏍️</div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      const popupContent = `
        <div style="font-family: Inter, sans-serif; font-size: 13px;">
          <strong style="color: #111; font-size: 14px;">${rider.name}</strong><br/>
          <span style="color: ${isBusy ? '#e67e22' : '#27ae60'}; font-weight: 700;">
            ${isBusy ? '● On Delivery' : '● Available'}
          </span><br/>
          <span>Bike: ${rider.bikeNumber || 'N/A'}</span><br/>
          <span>Phone: ${rider.phone || 'N/A'}</span><br/>
          <span>Deliveries: ${rider.totalDeliveries || 0}</span>
        </div>
      `;

      if (riderMarkersRef.current.has(rider.id)) {
        const marker = riderMarkersRef.current.get(rider.id)!;
        marker.setLatLng([lat, lng]);
        marker.setIcon(riderIcon);
        marker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([lat, lng], { icon: riderIcon })
          .addTo(map)
          .bindPopup(popupContent);

        if (onSelectRider) {
          marker.on('click', () => onSelectRider(rider));
        }

        riderMarkersRef.current.set(rider.id, marker);
      }
    });
  }, [riders, onSelectRider]);

  return (
    <div
      ref={mapContainerRef}
      style={{
        width: '100%',
        minHeight: '460px',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid rgba(200, 155, 60, 0.25)',
        backgroundColor: '#161922',
        position: 'relative',
        zIndex: 1,
      }}
    />
  );
}
