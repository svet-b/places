import { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';

const PRIORITIES = [
  { value: 1, label: '1 - High' },
  { value: 2, label: '2 - Medium' },
  { value: 3, label: '3 - Low' },
] as const;

interface Props {
  activePriorities: Set<number>;
  onTogglePriority: (priority: number) => void;
}

function prioSummary(active: Set<number>): string {
  if (active.size === 3) return 'Prio: All';
  return `Prio: ${[...active].sort().join(', ')}`;
}

export function PriorityDropdown({ activePriorities, onTogglePriority }: Props) {
  const [open, setOpen] = useState(false);
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

  const allActive = activePriorities.size === 3;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-full shadow-md border cursor-pointer transition-all"
        style={{
          background: '#fff',
          borderColor: allActive ? '#e5e5e5' : '#333',
          color: allActive ? '#666' : '#333',
        }}
      >
        <span className="text-[13px] font-medium whitespace-nowrap">{prioSummary(activePriorities)}</span>
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[150px] z-50">
          {PRIORITIES.map((p) => {
            const active = activePriorities.has(p.value);
            return (
              <button
                key={p.value}
                onClick={() => onTogglePriority(p.value)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer border-none bg-transparent"
              >
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: active ? '#333' : '#ccc',
                    background: active ? '#333' : 'transparent',
                  }}
                >
                  {active && <Check className="h-3 w-3 text-white" />}
                </div>
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
