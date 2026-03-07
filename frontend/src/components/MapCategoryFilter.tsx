import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CATEGORIES } from '../constants';

interface Props {
  activeCategories: Set<string>;
  onToggle: (category: string) => void;
}

function summaryText(active: Set<string>): string {
  if (active.size === 0) return 'Categories';
  if (active.size === CATEGORIES.length) return 'All categories';
  if (active.size <= 2) {
    return CATEGORIES.filter((c) => active.has(c.id)).map((c) => c.label).join(', ');
  }
  return `${active.size} categories`;
}

export function MapCategoryFilter({ activeCategories, onToggle }: Props) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    if (expanded) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  const hasActive = activeCategories.size > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-full shadow-md border cursor-pointer transition-all"
        style={{
          background: '#fff',
          borderColor: hasActive ? '#333' : '#e5e5e5',
          color: hasActive ? '#333' : '#666',
        }}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="text-[13px] font-medium whitespace-nowrap">{summaryText(activeCategories)}</span>
      </button>

      {expanded && (
        <div className="absolute top-full left-0 mt-1.5 bg-white rounded-lg shadow-lg border border-border p-1.5 flex gap-1 overflow-x-auto max-w-[85vw]">
          {CATEGORIES.map((cat) => {
            const active = activeCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => onToggle(cat.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all shrink-0 border-[1.5px]"
                style={{
                  borderColor: active ? cat.color : '#e5e5e5',
                  background: active ? `${cat.color}18` : '#fafafa',
                  color: active ? cat.color : '#888',
                }}
              >
                <cat.icon className="h-3.5 w-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
