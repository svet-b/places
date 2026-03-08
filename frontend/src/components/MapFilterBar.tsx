import { useState, useRef, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';

const PRIORITIES = [
  { value: 1, label: '1 - High' },
  { value: 2, label: '2 - Medium' },
  { value: 3, label: '3 - Low' },
] as const;

interface Props {
  activePriorities: Set<number>;
  onTogglePriority: (priority: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

function prioSummary(active: Set<number>): string {
  if (active.size === 3) return 'Prio: All';
  return `Prio: ${[...active].sort().join(', ')}`;
}

export function MapFilterBar({ activePriorities, onTogglePriority, search, onSearchChange }: Props) {
  const [searchOpen, setSearchOpen] = useState(!!search);
  const [prioOpen, setPrioOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const prioRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function handleClick(e: Event) {
      if (prioRef.current && !prioRef.current.contains(e.target as Node)) {
        setPrioOpen(false);
      }
    }
    if (prioOpen) {
      document.addEventListener('pointerdown', handleClick, true);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClick, true);
    };
  }, [prioOpen]);

  const allActive = activePriorities.size === 3;

  return (
    <div className="flex gap-2 items-start">
      {/* Priority dropdown */}
      <div ref={prioRef} className="relative">
        <button
          onClick={() => setPrioOpen((prev) => !prev)}
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-full shadow-md border cursor-pointer transition-all"
          style={{
            background: '#fff',
            borderColor: allActive ? '#e5e5e5' : '#333',
            color: allActive ? '#666' : '#333',
          }}
        >
          <span className="text-[13px] font-medium whitespace-nowrap">{prioSummary(activePriorities)}</span>
        </button>

        {prioOpen && (
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

      {/* Search */}
      {searchOpen ? (
        <div className="flex items-center h-8 rounded-full shadow-md border border-[#333] bg-white px-2.5 gap-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="border-none outline-none bg-transparent text-[13px] w-[120px]"
          />
          <button
            onClick={() => { onSearchChange(''); setSearchOpen(false); }}
            className="cursor-pointer border-none bg-transparent p-0"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchOpen(true)}
          className="flex items-center justify-center h-8 w-8 rounded-full shadow-md border cursor-pointer transition-all"
          style={{
            background: '#fff',
            borderColor: search ? '#333' : '#e5e5e5',
          }}
        >
          <Search className="h-3.5 w-3.5 text-[#666]" />
        </button>
      )}
    </div>
  );
}
