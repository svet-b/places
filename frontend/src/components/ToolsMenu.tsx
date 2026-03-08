import { useState, useRef, useEffect } from 'react';
import { Menu, DatabaseZap, Loader2 } from 'lucide-react';
import * as api from '../api/client';

interface Props {
  onComplete: (message: string) => void;
  onPlacesChanged: () => void;
}

export function ToolsMenu({ onComplete, onPlacesChanged }: Props) {
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
          <Menu className="h-4 w-4 text-[#666]" />
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1.5 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[200px] z-50"
        >
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
