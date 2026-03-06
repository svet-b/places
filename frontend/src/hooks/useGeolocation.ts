import { useEffect, useState } from 'react';

interface GeoState {
  location: { lat: number; lng: number } | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeoState {
  const [state, setState] = useState<GeoState>({
    location: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({ location: null, error: 'Geolocation not supported', loading: false });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          error: null,
          loading: false,
        });
      },
      (err) => {
        setState({ location: null, error: err.message, loading: false });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  return state;
}
