import { useState, useRef, useEffect } from 'react';
import { NewPlace } from '../types';
import { CATEGORIES } from '../constants';

interface Props {
  onSubmit: (place: NewPlace) => void;
  mapsLoaded?: boolean;
}

export function AddPlaceForm({ onSubmit, mapsLoaded }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('restaurant');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Set up Google Places Autocomplete
  useEffect(() => {
    if (!mapsLoaded || !addressInputRef.current || autocompleteRef.current) return;

    // Check if Places library is available
    if (!google.maps.places?.Autocomplete) return;

    const ac = new google.maps.places.Autocomplete(addressInputRef.current, {
      types: ['establishment'],
      fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components', 'url'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;

      if (place.formatted_address) setAddress(place.formatted_address);
      setLat(place.geometry.location.lat());
      setLng(place.geometry.location.lng());
      if (place.place_id) setGooglePlaceId(place.place_id);
      if (place.url) setGoogleMapsUrl(place.url);

      // Auto-fill name if empty
      if (!name && place.name) setName(place.name);

      // Extract city from address components
      const cityComp = place.address_components?.find(
        (c) => c.types.includes('locality'),
      );
      if (cityComp) setCity(cityComp.long_name);
    });

    autocompleteRef.current = ac;
  }, [mapsLoaded, name]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      category,
      address,
      city,
      source,
      notes,
      lat,
      lng,
      google_place_id: googlePlaceId,
      google_maps_url: googleMapsUrl,
    });
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 8,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: 13,
    fontWeight: 500,
    color: '#444',
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 16, background: '#f9f9f9', borderRadius: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Boot Café" required />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Category</label>
        <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Address {mapsLoaded && '(autocomplete enabled)'}</label>
        <input
          ref={addressInputRef}
          style={inputStyle}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Search for a place or type an address"
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>City</label>
        <input style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Source</label>
        <input style={inputStyle} value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram — @specialtycoffee" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tiny but excellent"
        />
      </div>

      <button
        type="submit"
        style={{
          width: '100%',
          padding: 10,
          borderRadius: 8,
          border: 'none',
          background: '#111',
          color: '#fff',
          fontSize: 14,
          cursor: 'pointer',
        }}
      >
        Add Place
      </button>
    </form>
  );
}
