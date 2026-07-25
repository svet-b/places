import { useState, useRef, useEffect } from 'react';
import { MoreHorizontal, DatabaseZap, Loader2, ExternalLink, Check, MapPin } from 'lucide-react';
import * as api from '../api/client';

interface Props {
  onComplete: (message: string) => void;
  onPlacesChanged: () => void;
  spreadsheetUrl: string | null;
  cities: string[];
  activeCity: string;
  onCityChange: (city: string) => void;
}

export function ToolsMenu({ onComplete, onPlacesChanged, spreadsheetUrl, cities, activeCity, onCityChange }: Props) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('pointerdown', handleClick, true);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClick, true);
    };
  }, [open]);

  async function handleFillMissing() {
    setOpen(false);
    setRunning(true);
    try {
      const result = await api.fillMissingData();
      if (result.total === 0) {
        onComplete('All places already have Google data');
      } else {
        let msg = `Filled ${result.matched} of ${result.total} places`;
        if (result.failed > 0) {
          msg += ` (${result.failed} failed: ${result.failures.join(', ')})`;
        }
        onComplete(msg);
        if (result.matched > 0) {
          onPlacesChanged();
        }
      }
    } catch {
      onComplete('Failed to fill missing data');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={running}
        className="flex items-center justify-center h-8 w-8 rounded-full shadow-md border cursor-pointer transition-all"
        style={{ background: '#fff', borderColor: '#e5e5e5' }}
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <MoreHorizontal className="h-4 w-4 text-[#666]" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full mb-1.5 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[200px] z-50"
        >
          {cities.length > 1 && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                City
              </div>
              {cities.map((city) => (
                <button
                  key={city}
                  onClick={() => { onCityChange(city); setOpen(false); }}
                  className="flex items-center justify-between w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    {activeCity === city ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <span className="w-3.5" />
                    )}
                    {city}
                  </span>
                </button>
              ))}
              <hr className="my-1 border-border" />
            </>
          )}
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer no-underline text-foreground"
            >
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              Google Sheet
            </a>
          )}
          <button
            onClick={handleFillMissing}
            className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
          >
            <DatabaseZap className="h-4 w-4 text-muted-foreground" />
            Fill missing data
          </button>
        </div>
      )}
    </div>
  );
}
