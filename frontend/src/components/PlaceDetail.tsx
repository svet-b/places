import { useState } from 'react';
import { Place } from '../types';
import { CATEGORIES, CATEGORY_MAP } from '../constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Check, Pencil, Trash2, ExternalLink } from 'lucide-react';

interface Props {
  place: Place;
  onClose: () => void;
  onToggleVisited: (place: Place) => void;
  onUpdate: (id: string, updates: Partial<Place>) => void;
  onDelete: (id: string) => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5 font-semibold">
        {label}
      </div>
      <div className="text-sm text-foreground/85">{value}</div>
    </div>
  );
}

export function PlaceDetail({ place, onClose, onToggleVisited, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [screenshotEnlarged, setScreenshotEnlarged] = useState(false);
  const [form, setForm] = useState({
    name: place.name,
    category: place.category,
    priority: place.priority,
    cuisine: place.cuisine,
    address: place.address,
    city: place.city,
    source: place.source,
    list: place.list,
    notes: place.notes,
  });

  const cat = CATEGORY_MAP[place.category] ?? CATEGORY_MAP['other']!;
  const mapsUrl =
    place.google_maps_url ||
    (place.lat && place.lng
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : null);

  function handleSave() {
    const changes: Partial<Place> = {};
    for (const [key, value] of Object.entries(form)) {
      if (value !== place[key as keyof Place]) {
        (changes as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(changes).length > 0) {
      onUpdate(place.id, changes);
    }
    setEditing(false);
  }

  function handleDelete() {
    onDelete(place.id);
    onClose();
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] p-5 z-[1000] max-h-[75vh] overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          {editing ? (
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          ) : (
            <>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div
                  className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: `${cat.color}15`,
                    border: `1px solid ${cat.color}30`,
                  }}
                >
                  <cat.icon className="h-5 w-5" style={{ color: cat.color }} />
                </div>
                <span
                  className="text-[11px] px-2.5 py-0.5 rounded-lg font-semibold tracking-wide uppercase"
                  style={{
                    background: `${cat.color}15`,
                    color: cat.color,
                  }}
                >
                  {cat.label}
                </span>
                {place.priority && (
                  <span
                    className="text-[11px] px-2.5 py-0.5 rounded-lg font-semibold tracking-wide"
                    style={{
                      background: Number(place.priority) === 1 ? '#EF444415' : Number(place.priority) === 2 ? '#F59E0B15' : '#94A3B815',
                      color: Number(place.priority) === 1 ? '#EF4444' : Number(place.priority) === 2 ? '#F59E0B' : '#94A3B8',
                    }}
                  >
                    {Number(place.priority) === 1 ? 'High' : Number(place.priority) === 2 ? 'Medium' : 'Low'}
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold mb-1">{place.name}</h2>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0 border-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <div>
            <Label>Category</Label>
            <Select className="mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Priority</Label>
            <Select className="mt-1" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}>
              <option value={1}>1 (High)</option>
              <option value={2}>2 (Medium)</option>
              <option value={3}>3 (Low)</option>
            </Select>
          </div>
          <div>
            <Label>Cuisine</Label>
            <Input className="mt-1" value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} />
          </div>
          <div>
            <Label>Address</Label>
            <Input className="mt-1" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <Label>City</Label>
            <Input className="mt-1" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>Source</Label>
            <Input className="mt-1" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          </div>
          <div>
            <Label>List</Label>
            <Input className="mt-1" value={form.list} onChange={(e) => setForm({ ...form, list: e.target.value })} />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-1">
            <Button onClick={handleSave} className="flex-1">Save</Button>
            <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          {place.address && (
            <p className="text-[13px] text-muted-foreground mb-1">{place.address}</p>
          )}

          <div className="flex flex-col gap-3 mt-4">
            {place.cuisine && <Field label="Cuisine" value={place.cuisine} />}
            {place.city && <Field label="City" value={place.city} />}
            {place.source && <Field label="Source" value={place.source} />}
            {place.list && <Field label="List" value={place.list} />}
            {place.notes && <Field label="Notes" value={place.notes} />}
            {place.date_added && <Field label="Added" value={place.date_added} />}
          </div>

          {/* Visited toggle */}
          <div className="mt-4">
            <button
              onClick={() => onToggleVisited(place)}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-[10px] text-[13px] font-medium cursor-pointer transition-colors border-[1.5px]"
              style={{
                borderColor: place.visited ? '#22C55E40' : '#ddd',
                background: place.visited ? 'rgba(34,197,94,0.08)' : '#fafafa',
                color: place.visited ? '#22C55E' : '#666',
              }}
            >
              <Check className="h-4 w-4" />
              {place.visited ? 'Visited' : 'Mark as visited'}
            </button>
          </div>

          {place.screenshot_url && (
            <>
              <img
                src={place.screenshot_url}
                alt="Screenshot"
                loading="lazy"
                onClick={() => setScreenshotEnlarged(true)}
                className="w-full max-h-[200px] object-contain rounded-lg mt-3 cursor-pointer"
              />
              {screenshotEnlarged && (
                <div
                  onClick={() => setScreenshotEnlarged(false)}
                  className="fixed inset-0 bg-black/90 z-[2000] flex items-center justify-center cursor-pointer"
                >
                  <img
                    src={place.screenshot_url}
                    alt="Screenshot"
                    className="max-w-[95vw] max-h-[95vh] object-contain"
                  />
                </div>
              )}
            </>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary/90 transition-colors no-underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open in Maps
              </a>
            )}
            <Button variant="outline" onClick={() => setEditing(true)} className="flex-1">
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Edit
            </Button>
          </div>

          <button
            onClick={() => setConfirmDelete(true)}
            className="mt-2 w-full py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border"
            style={{
              borderColor: 'rgba(232,93,74,0.2)',
              background: 'rgba(232,93,74,0.05)',
              color: '#E85D4A',
            }}
          >
            <Trash2 className="h-3.5 w-3.5 inline mr-1" />
            Remove
          </button>

          {confirmDelete && (
            <div className="mt-3 p-3 bg-destructive/5 rounded-lg border border-destructive/20">
              <p className="text-sm mb-2">Delete &ldquo;{place.name}&rdquo;?</p>
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDelete} size="sm" className="flex-1">
                  Yes, delete
                </Button>
                <Button variant="outline" onClick={() => setConfirmDelete(false)} size="sm" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
