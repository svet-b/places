let promise: Promise<void> | null = null;

export function loadGoogleMaps(key: string): Promise<void> {
  if (promise) return promise;

  if (!key) {
    return Promise.reject(new Error('Google Maps key not provided'));
  }

  promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=marker,places&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return promise;
}
