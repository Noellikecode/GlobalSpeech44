import { useEffect, useRef, useState } from "react";
import { Clinic } from "@/types/clinic";

interface MinimalMapProps {
  clinics: Clinic[];
  filteredClinics: Clinic[];
  onClinicClick: (clinic: Clinic) => void;
  isLoading?: boolean;
  selectedState?: string;
}

export default function MinimalMap({ filteredClinics, onClinicClick, isLoading, selectedState }: MinimalMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (isLoading || !mapRef.current) return;

    let L: any;
    let map: any;

    async function loadMap() {
      try {
        // Import Leaflet
        L = await import('leaflet');

        // Force load CSS
        const cssLoaded = new Promise<void>((resolve) => {
          if (document.querySelector('link[href*="leaflet.css"]')) {
            resolve();
            return;
          }

          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          link.onload = () => resolve();
          link.onerror = () => resolve(); // Continue even if CSS fails
          document.head.appendChild(link);

          // Fallback
          setTimeout(resolve, 1000);
        });

        await cssLoaded;

        // Configure Leaflet icons without shadows
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: '', // Remove shadow completely
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [0, 0] // No shadow size
        });

        // Create map with explicit container dimensions
        if (!mapRef.current) return;

        // Force container size
        mapRef.current.style.width = '100%';
        mapRef.current.style.height = '100%';
        mapRef.current.style.minHeight = '500px';

        map = L.map(mapRef.current, {
          center: [39.8283, -98.5795],
          zoom: 4,
          attributionControl: true,
          zoomControl: true,
          scrollWheelZoom: true,
          doubleClickZoom: true,
          boxZoom: true,
          keyboard: true,
          dragging: true,
          touchZoom: true,
          zoomAnimation: true,
          fadeAnimation: true,
          markerZoomAnimation: true
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        console.log('Map container created, adding markers...');
        setMapLoaded(true);

        // Add markers
        const validClinics = filteredClinics.filter(
          clinic => clinic.latitude && clinic.longitude && 
                   !isNaN(clinic.latitude) && !isNaN(clinic.longitude)
        );

        console.log(`Adding ${validClinics.length} markers to map`);

        // Deployment-optimized marker management
        const maxMarkers = 1500; // Limit for deployment stability
        const displayClinics = validClinics.slice(0, maxMarkers);

        // Batch marker creation for smooth deployment performance
        const createMarkers = () => {
          const markers = [];

          displayClinics.forEach(clinic => {
            // Create shadowless marker icon
            const shadowlessIcon = L.icon({
              iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
              iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
              shadowUrl: '', // No shadow
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [0, 0] // No shadow
            });

            const marker = L.marker([clinic.latitude, clinic.longitude], { 
              icon: shadowlessIcon 
            })
              .bindPopup(`<strong>${clinic.name}</strong><br/>${clinic.city}`, {
                maxWidth: 200,
                closeButton: true
              })
              .on('click', () => {
                // Gentle zoom - only zoom if currently zoomed out, max zoom level 8
                const currentZoom = map.getZoom();
                const targetZoom = Math.min(Math.max(currentZoom, 6), 8);
                map.setView([clinic.latitude, clinic.longitude], targetZoom);
                onClinicClick(clinic);
              });

            markers.push(marker);
            marker.addTo(map);
          });

          return markers;
        };

        const markers = createMarkers();
        console.log(`Deployment: Added ${markers.length} markers successfully`);

        // State-focused zoom logic
        if (validClinics.length > 0) {
          if (selectedState && selectedState !== 'all') {
            // Filter clinics to only those in the selected state
            const stateClinics = validClinics.filter(clinic => {
              // Assuming the clinic object has a state property
              // Adjust this based on your actual data structure
              return clinic.state === selectedState || 
                     clinic.state?.toLowerCase() === selectedState.toLowerCase() ||
                     clinic.address?.includes(selectedState) ||
                     clinic.city?.includes(selectedState);
            });

            if (stateClinics.length > 0) {
              // Create bounds from state-specific clinics only
              const stateBounds = L.latLngBounds(
                stateClinics.map(clinic => [clinic.latitude, clinic.longitude])
              );

              // Fit to state bounds with minimal padding and no zoom restriction
              map.fitBounds(stateBounds, { 
                padding: [10, 10] // Minimal padding for tighter fit
                // Remove maxZoom to allow full zoom-in
              });

              console.log(`Zooming to ${stateClinics.length} clinics in ${selectedState}`);
            } else {
              console.log(`No clinics found specifically for state: ${selectedState}`);
              // Fallback: if no state-specific clinics found, use all clinics
              const clinicBounds = L.latLngBounds(
                validClinics.map(clinic => [clinic.latitude, clinic.longitude])
              );
              map.fitBounds(clinicBounds, { 
                padding: [20, 20]
                // Allow natural zoom level
              });
            }
          } else {
            // No specific state selected - show all clinics (national view)
            // Use sample for performance but keep national perspective
            const sampleClinics = validClinics.filter((_, index) => index % 15 === 0);
            const group = new L.FeatureGroup(
              sampleClinics.map(c => L.marker([c.latitude, c.longitude]))
            );
            map.fitBounds(group.getBounds(), { 
              padding: [40, 40],
              maxZoom: 6 // Only restrict zoom for national view
            });
          }
        }

        // Force map to invalidate size after setup
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
        }, 100);

      } catch (error) {
        console.error('Map loading failed:', error);
      }
    }

    loadMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [filteredClinics, isLoading, onClinicClick, selectedState]); // Added selectedState to dependencies

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div 
        ref={mapRef} 
        className="w-full h-full"
        style={{ 
          minHeight: '500px',
          position: 'relative',
          zIndex: 1
        }}
      />

      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-100 z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-700">Initializing map...</p>
          </div>
        </div>
      )}

      {mapLoaded && (
        <div className="absolute top-4 right-4 bg-white rounded p-2 shadow-lg z-20">
          <div className="text-sm font-medium">Speech Therapy Centers</div>
          <div className="text-xs text-gray-600">
            {filteredClinics.length} locations
            {selectedState && selectedState !== 'all' && (
              <span className="block">in {selectedState}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}