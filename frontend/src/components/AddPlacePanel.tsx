import { useState, useRef, useEffect } from 'react';
import { Place, NewPlace } from '../types';
import { CATEGORIES } from '../constants';
import * as api from '../api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, Search, Link, Loader2, Instagram } from 'lucide-react';

interface Props {
  onSubmit: (place: NewPlace, imageBase64?: string) => void;
  onCancel: () => void;
  mapsLoaded: boolean;
  places: Place[];
  onViewExisting: (place: Place) => void;
}

async function compressImage(file: File, maxSize = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl.replace(/^data:image\/[^;]+;base64,/, ''));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

interface PlaceIdentity {
  name: string;
  address: string;
  lat: number;
  lng: number;
  google_place_id: string;
  google_maps_url: string;
  city: string;
}

export function AddPlacePanel({ onSubmit, onCancel, mapsLoaded, places, onViewExisting }: Props) {
  const [identity, setIdentity] = useState<PlaceIdentity | null>(null);
  const [duplicatePlace, setDuplicatePlace] = useState<Place | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [mapsUrl, setMapsUrl] = useState('');
  const [resolvingUrl, setResolvingUrl] = useState(false);
  const [instagramUrl, setInstagramUrl] = useState('');
  const [analyzingInstagram, setAnalyzingInstagram] = useState(false);
  const [priority, setPriority] = useState(2);
  const [category, setCategory] = useState('restaurant');
  const [cuisine, setCuisine] = useState('');
  const [source, setSource] = useState('');
  const [list, setList] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  function checkDuplicate(googlePlaceId: string): Place | null {
    if (!googlePlaceId) return null;
    return places.find((p) => p.google_place_id === googlePlaceId) ?? null;
  }

  function setIdentityWithDupeCheck(id: PlaceIdentity) {
    const dupe = checkDuplicate(id.google_place_id);
    setDuplicatePlace(dupe);
    setIdentity(id);
  }

  const fileRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!mapsLoaded || !searchInputRef.current || autocompleteRef.current) return;
    if (!google.maps.places?.Autocomplete) return;

    const ac = new google.maps.places.Autocomplete(searchInputRef.current, {
      types: ['establishment'],
      fields: ['formatted_address', 'geometry', 'place_id', 'name', 'address_components', 'url'],
      componentRestrictions: { country: 'fr' },
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;

      const cityComp = place.address_components?.find(
        (c) => c.types.includes('locality'),
      );

      setIdentityWithDupeCheck({
        name: place.name ?? '',
        address: place.formatted_address ?? '',
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        google_place_id: place.place_id ?? '',
        google_maps_url: place.url ?? '',
        city: cityComp?.long_name ?? 'Paris',
      });
    });

    autocompleteRef.current = ac;
  }, [mapsLoaded]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    try {
      const base64 = await compressImage(file);
      setImageBase64(base64);
    } catch {
      setError('Failed to process image');
    }
  }

  async function handleAnalyze() {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const result = await api.analyzeScreenshot(imageBase64);
      const m = result.merged;
      setIdentityWithDupeCheck({
        name: m.name,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        google_place_id: m.google_place_id,
        google_maps_url: m.google_maps_url,
        city: m.city || 'Paris',
      });
      if (m.category) setCategory(m.category);
      if (m.source) setSource(m.source);
      if (m.notes) setNotes(m.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleResolveUrl() {
    if (!mapsUrl.trim()) return;
    setResolvingUrl(true);
    setError(null);
    try {
      const resolved = await api.resolveUrl(mapsUrl.trim());
      setIdentityWithDupeCheck({
        name: resolved.name,
        address: resolved.address,
        lat: resolved.lat,
        lng: resolved.lng,
        google_place_id: resolved.google_place_id,
        google_maps_url: resolved.google_maps_url,
        city: resolved.city || 'Paris',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not resolve URL');
    } finally {
      setResolvingUrl(false);
    }
  }

  async function handleAnalyzeInstagram() {
    if (!instagramUrl.trim()) return;
    setAnalyzingInstagram(true);
    setError(null);
    try {
      const result = await api.analyzeInstagram(instagramUrl.trim());
      const m = result.merged;
      setIdentityWithDupeCheck({
        name: m.name,
        address: m.address,
        lat: m.lat,
        lng: m.lng,
        google_place_id: m.google_place_id,
        google_maps_url: m.google_maps_url,
        city: m.city || 'Paris',
      });
      if (m.category) setCategory(m.category);
      if (m.source) setSource(m.source);
      if (m.notes) setNotes(m.notes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze Instagram post');
    } finally {
      setAnalyzingInstagram(false);
    }
  }

  function handleSave() {
    if (!identity?.name?.trim()) return;
    onSubmit(
      {
        name: identity.name.trim(),
        category,
        cuisine,
        address: identity.address,
        city: identity.city || 'Paris',
        lat: identity.lat,
        lng: identity.lng,
        google_place_id: identity.google_place_id,
        google_maps_url: identity.google_maps_url,
        source,
        list,
        notes,
        priority,
      },
      imageBase64 ?? undefined,
    );
  }

  const identified = identity !== null;

  return (
    <div className="p-4 bg-muted rounded-xl mb-4 max-h-[70vh] overflow-y-auto">
      {!identified ? (
        <>
          <p className="text-sm font-semibold mb-3">Find the place</p>

          {/* Screenshot upload */}
          <div className="mb-3 pb-3 border-b border-border">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {!imagePreview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-4 rounded-lg border-2 border-dashed border-border bg-background cursor-pointer text-sm text-muted-foreground hover:border-foreground/30 transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload screenshot
              </button>
            ) : (
              <div>
                <img
                  src={imagePreview}
                  alt="Screenshot"
                  className="w-full max-h-[150px] object-contain rounded-lg"
                  style={{ opacity: analyzing ? 0.5 : 1 }}
                />
                {analyzing ? (
                  <p className="text-center text-muted-foreground text-xs mt-2 flex items-center justify-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Analyzing...
                  </p>
                ) : (
                  <Button onClick={handleAnalyze} className="w-full mt-2" size="sm">
                    Analyze Screenshot
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Google Maps URL */}
          <div className="mb-3 pb-3 border-b border-border">
            <Label className="mb-1.5 flex items-center gap-1.5">
              <Link className="h-3 w-3" />
              Google Maps URL
            </Label>
            <div className="flex gap-1.5">
              <Input
                className="flex-1"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
                placeholder="Paste a Google Maps link"
              />
              <Button
                onClick={handleResolveUrl}
                disabled={!mapsUrl.trim() || resolvingUrl}
                size="sm"
              >
                {resolvingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
              </Button>
            </div>
          </div>

          {/* Instagram URL */}
          <div className="mb-3 pb-3 border-b border-border">
            <Label className="mb-1.5 flex items-center gap-1.5">
              <Instagram className="h-3 w-3" />
              Instagram post
            </Label>
            <div className="flex gap-1.5">
              <Input
                className="flex-1"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                placeholder="Paste an Instagram post link"
              />
              <Button
                onClick={handleAnalyzeInstagram}
                disabled={!instagramUrl.trim() || analyzingInstagram}
                size="sm"
              >
                {analyzingInstagram ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-2">
            <Label className="mb-1.5 flex items-center gap-1.5">
              <Search className="h-3 w-3" />
              Search by name
            </Label>
            <Input ref={searchInputRef} placeholder="Search for a place..." />
          </div>

          {error && <p className="text-destructive text-xs mt-2">{error}</p>}

          <Button variant="outline" onClick={onCancel} className="w-full mt-3">
            Cancel
          </Button>
        </>
      ) : (
        <>
          {/* Step 2: Review & metadata */}
          <div className="mb-3">
            <p className="text-base font-semibold">{identity.name}</p>
            {identity.address && (
              <p className="text-xs text-muted-foreground mt-0.5">{identity.address}</p>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setIdentity(null); setDuplicatePlace(null); }}
              className="mt-1.5 h-7 text-xs text-muted-foreground"
            >
              Change place
            </Button>
          </div>

          {duplicatePlace ? (
            <div className="rounded-lg border border-border bg-background p-3 mb-3">
              <p className="text-sm font-medium">
                This place is already in your list
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                &ldquo;{duplicatePlace.name}&rdquo; was added on {duplicatePlace.date_added}.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={() => {
                    onViewExisting(duplicatePlace);
                    onCancel();
                  }}
                  className="flex-1"
                >
                  View existing entry
                </Button>
                <Button variant="outline" size="sm" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
          {imagePreview && (
            <img
              src={imagePreview}
              alt="Screenshot"
              className="w-full max-h-[120px] object-contain rounded-lg mb-3"
            />
          )}

          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label>Category</Label>
                <Select className="mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </Select>
              </div>
              <div className="flex-1">
                <Label>Priority</Label>
                <Select className="mt-1" value={priority} onChange={(e) => setPriority(Number(e.target.value))}>
                  <option value={1}>1 (High)</option>
                  <option value={2}>2 (Medium)</option>
                  <option value={3}>3 (Low)</option>
                </Select>
              </div>
            </div>
            <div>
              <Label>Cuisine</Label>
              <Input className="mt-1" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Italian, French, etc." />
            </div>
            <div>
              <Label>Source</Label>
              <Input className="mt-1" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Instagram - @account" />
            </div>
            <div>
              <Label>List</Label>
              <Input className="mt-1" value={list} onChange={(e) => setList(e.target.value)} placeholder="50 best coffee shops in Paris" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tiny but excellent" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">Save Place</Button>
              <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
            </div>
          </div>

          {error && <p className="text-destructive text-xs mt-2">{error}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
}
