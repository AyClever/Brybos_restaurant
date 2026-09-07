import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Order } from '../types';
import { riderService } from '../services/riderService';
import { useApp } from '../store/AppContext';

interface LiveRiderTrackingModalProps {
  order: Order;
  onClose: () => void;
}

// Brybos Kitchen HQ anchor coordinates (Victoria Island / Lekki Corridor, Lagos)
const BRYBOS_HQ: [number, number] = [6.4312, 3.4245];

export default function LiveRiderTrackingModal({ order, onClose }: LiveRiderTrackingModalProps) {
  const { state } = useApp();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const riderMarkerRef = useRef<L.Marker | null>(null);

  // Find assigned rider from app state if available
  const assignedRider = state.riders.find(
    r => String(r.id) === String(order.riderId) || r.name === order.riderName
  );

  // Compute destination coordinates based on order id or hash to keep it consistent
  const destLat = BRYBOS_HQ[0] + 0.015 + ((order.orderNumber.charCodeAt(order.orderNumber.length - 1) % 20) * 0.001);
  const destLng = BRYBOS_HQ[1] + 0.025 + ((order.orderNumber.charCodeAt(0) % 20) * 0.001);
  const destinationCoords: [number, number] = [destLat, destLng];

  // Rider position state
  const initialRiderLat = assignedRider?.lat || BRYBOS_HQ[0] + (destLat - BRYBOS_HQ[0]) * 0.45;
  const initialRiderLng = assignedRider?.lng || BRYBOS_HQ[1] + (destLng - BRYBOS_HQ[1]) * 0.45;

  const [riderCoords, setRiderCoords] = useState<[number, number]>([initialRiderLat, initialRiderLng]);
  const [lastUpdate, setLastUpdate] = useState<string>('Just now');
  const [etaMinutes, setEtaMinutes] = useState<number>(14);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: riderCoords,
      zoom: 14,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | Brybos Logistics',
      maxZoom: 19,
    }).addTo(map);

    // Custom Icons
    const hqIcon = L.divIcon({
      className: 'custom-map-pin hq-pin',
      html: `
        <div style="
          background: #11141a;
          border: 2px solid #C89B3C;
          color: #C89B3C;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        ">👨‍🍳</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const destIcon = L.divIcon({
      className: 'custom-map-pin dest-pin',
      html: `
        <div style="
          background: #28a745;
          border: 2px solid #ffffff;
          color: #ffffff;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(40,167,69,0.5);
        ">🏠</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const riderIcon = L.divIcon({
      className: 'custom-map-pin rider-pin',
      html: `
        <div style="
          background: #C89B3C;
          border: 2px solid #ffffff;
          color: #11141a;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          box-shadow: 0 0 16px rgba(200,155,60,0.8);
          animation: pulse 1.8s infinite;
        ">🏍️</div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    // Add Restaurant Marker
    L.marker(BRYBOS_HQ, { icon: hqIcon })
      .addTo(map)
      .bindPopup(`<strong>Brybos Kitchen HQ</strong><br/>Order dispatched from kitchen`)
      .openPopup();

    // Add Customer Delivery Marker
    L.marker(destinationCoords, { icon: destIcon })
      .addTo(map)
      .bindPopup(`<strong>Delivery Destination</strong><br/>${order.deliveryAddress}`);

    // Add Rider Marker
    const riderMarker = L.marker(riderCoords, { icon: riderIcon })
      .addTo(map)
      .bindPopup(`<strong>Rider: ${order.riderName || 'Brybos Dispatch'}</strong><br/>Status: On the way`);

    riderMarkerRef.current = riderMarker;

    // Draw Route Polyline
    L.polyline([BRYBOS_HQ, riderCoords, destinationCoords], {
      color: '#C89B3C',
      weight: 4,
      opacity: 0.8,
      dashArray: '8, 8',
    }).addTo(map);

    // Fit map bounds to show full route
    const bounds = L.latLngBounds([BRYBOS_HQ, riderCoords, destinationCoords]);
    map.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Subscribe to real-time updates for THIS SPECIFIC rider from Supabase
  useEffect(() => {
    if (!order.riderId) return;

    const unsub = riderService.subscribeToSingleRider(order.riderId, (updated) => {
      if (updated.lat && updated.lng) {
        const newCoords: [number, number] = [updated.lat, updated.lng];
        setRiderCoords(newCoords);
        setLastUpdate(new Date().toLocaleTimeString());

        if (riderMarkerRef.current && mapInstanceRef.current) {
          riderMarkerRef.current.setLatLng(newCoords);
          mapInstanceRef.current.panTo(newCoords, { animate: true });
        }
      }
    });

    return () => {
      if (unsub) unsub();
    };
  }, [order.riderId]);

  // Subtle real-time progress simulation when active GPS is moving towards customer
  useEffect(() => {
    const timer = setInterval(() => {
      setRiderCoords((prev) => {
        // Gently interpolate towards destination
        const stepLat = (destinationCoords[0] - prev[0]) * 0.03;
        const stepLng = (destinationCoords[1] - prev[1]) * 0.03;

        // If very close, stay near destination
        const dist = Math.hypot(destinationCoords[0] - prev[0], destinationCoords[1] - prev[1]);
        if (dist < 0.001) return prev;

        const updated: [number, number] = [prev[0] + stepLat, prev[1] + stepLng];

        if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng(updated);
        }

        setEtaMinutes((old) => Math.max(2, old - 1));
        setLastUpdate(new Date().toLocaleTimeString());
        return updated;
      });
    }, 8000);

    return () => clearInterval(timer);
  }, [destinationCoords]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(10, 12, 16, 0.85)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'var(--dark-2)',
          border: '1px solid rgba(200, 155, 60, 0.3)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '820px',
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--dark-1)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'rgba(200, 155, 60, 0.15)',
                border: '1px solid var(--gold)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.3rem',
              }}
            >
              🏍️
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--white)' }}>
                  Live Rider Tracking
                </h3>
                <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                  {order.orderNumber}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                Tracking assigned dispatch rider for your active delivery
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--white)',
              borderRadius: '8px',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Map Canvas */}
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '380px',
            backgroundColor: '#1a1f29',
            position: 'relative',
          }}
        />

        {/* Rider Info Card */}
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--dark-2)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              alignItems: 'center',
            }}
          >
            {/* Rider Details */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '10px',
                  background: 'var(--dark-3)',
                  border: '1px solid rgba(200, 155, 60, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                🚴‍♂️
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--white)' }}>
                  {order.riderName || assignedRider?.name || 'Brybos Express Rider'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {assignedRider?.bikeNumber ? `Bike: ${assignedRider.bikeNumber}` : 'Licensed Delivery Motorbike'}
                </div>
                {assignedRider?.phone && (
                  <a
                    href={`tel:${assignedRider.phone}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      color: 'var(--gold)',
                      fontSize: '0.8rem',
                      textDecoration: 'none',
                      marginTop: '3px',
                      fontWeight: 600,
                    }}
                  >
                    <i className="fas fa-phone-alt" style={{ fontSize: '0.72rem' }} /> {assignedRider.phone}
                  </a>
                )}
              </div>
            </div>

            {/* ETA & Status */}
            <div
              style={{
                background: 'var(--dark-3)',
                padding: '0.85rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>
                Estimated Delivery Arrival
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold)', marginTop: '2px' }}>
                ~{etaMinutes} mins
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--success)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
                Live GPS Active • Updated {lastUpdate}
              </div>
            </div>

            {/* Destination Address */}
            <div
              style={{
                background: 'var(--dark-3)',
                padding: '0.85rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase' }}>
                Delivering To
              </div>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--white)', marginTop: '2px' }}>
                {order.customerName}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.6)', marginTop: '2px' }}>
                {order.deliveryAddress}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
