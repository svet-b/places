import { useState, useRef, useEffect } from 'react';
import { Check, ThumbsUp, ThumbsDown, Circle } from 'lucide-react';

export type VisitedStatus = 'liked' | 'notbeen' | 'disliked';

const OPTIONS: { value: VisitedStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'liked',   label: 'Liked',    icon: <ThumbsUp className="h-3.5 w-3.5" /> },
  { value: 'notbeen', label: 'Not been', icon: <Circle className="h-3.5 w-3.5" /> },
  { value: 'disliked',label: 'Disliked', icon: <ThumbsDown className="h-3.5 w-3.5" /> },
];

interface Props {
  active: Set<VisitedStatus>;
  onToggle: (status: VisitedStatus) => void;
}

export function VisitedFilter({ active, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('pointerdown', handleClick, true);
    return () => document.removeEventListener('pointerdown', handleClick, true);
  }, [open]);

  const isFiltered = active.size < 3;
  const activeOptions = OPTIONS.filter((o) => active.has(o.value));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 h-8 px-2.5 rounded-full shadow-md border cursor-pointer transition-all"
        style={{
          background: '#fff',
          borderColor: isFiltered ? '#333' : '#e5e5e5',
          color: isFiltered ? '#333' : '#666',
        }}
      >
        {activeOptions.map((o) => (
          <span key={o.value}>{o.icon}</span>
        ))}
        {activeOptions.length === 0 && <span className="text-[13px] font-medium">None</span>}
      </button>

      {open && (
        <div className="absolute left-0 mt-1.5 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[150px] z-50">
          {OPTIONS.map((o) => {
            const checked = active.has(o.value);
            return (
              <button
                key={o.value}
                onClick={() => onToggle(o.value)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer border-none bg-transparent"
              >
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: checked ? '#333' : '#ccc',
                    background: checked ? '#333' : 'transparent',
                  }}
                >
                  {checked && <Check className="h-3 w-3 text-white" />}
                </div>
                <span className="text-muted-foreground">{o.icon}</span>
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
