'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, Circle } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  radius?: number;
  onLocationSelect: (lat: number, lng: number, address?: string) => void;
  showRadius?: boolean;
  height?: string;
}

function LocationMarker({ 
  position, 
  onPositionChange 
}: { 
  position: [number, number] | null; 
  onPositionChange: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onPositionChange(e.latlng.lat, e.latlng.lng);
    },
  });

  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

export function MapPicker({
  initialLat = 12.9716, // Default to Bangalore
  initialLng = 77.5946,
  radius = 0,
  onLocationSelect,
  showRadius = false,
  height = '400px',
}: MapPickerProps) {
  const [position, setPosition] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');

  const handlePositionChange = useCallback(async (lat: number, lng: number) => {
    setPosition([lat, lng]);
    
    // Reverse geocode to get address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
        onLocationSelect(lat, lng, data.display_name);
      } else {
        onLocationSelect(lat, lng);
      }
    } catch (error) {
      console.error('Reverse geocode failed:', error);
      onLocationSelect(lat, lng);
    }
  }, [onLocationSelect]);

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      if (data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newLat = parseFloat(lat);
        const newLng = parseFloat(lon);
        setPosition([newLat, newLng]);
        setAddress(display_name);
        onLocationSelect(newLat, newLng, display_name);
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handlePositionChange(latitude, longitude);
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLoading(false);
        }
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
            className="pr-10"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={searchLocation}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          variant="outline"
          onClick={getCurrentLocation}
          disabled={loading}
        >
          <Navigation className="h-4 w-4 mr-2" />
          Current Location
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ height }}>
        <MapContainer
          center={position || [initialLat, initialLng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker position={position} onPositionChange={handlePositionChange} />
          {showRadius && radius > 0 && position && (
            <Circle
              center={position}
              radius={radius}
              pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
            />
          )}
        </MapContainer>
      </div>

      {position && (
        <div className="bg-gray-50 p-3 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Selected Location</span>
          </div>
          <div className="text-sm space-y-1">
            <p><span className="text-gray-500">Latitude:</span> {position[0].toFixed(6)}</p>
            <p><span className="text-gray-500">Longitude:</span> {position[1].toFixed(6)}</p>
            {address && (
              <p className="text-gray-600 mt-2">{address}</p>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Click on the map to select a location, or use the search bar above.
      </p>
    </div>
  );
}

export default MapPicker;
