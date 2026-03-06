let promise: Promise<void> | null = null;

export function loadGoogleMaps(): Promise<void> {
  if (promise) return promise;

  const key = import.meta.env.VITE_GOOGLE_MAPS_KEY as string;
  if (!key) {
    return Promise.reject(new Error('VITE_GOOGLE_MAPS_KEY not set'));
  }

  promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return promise;
}
