import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal, Check } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '../constants';

interface Props {
  activeCategories: Set<string>;
  onToggle: (category: string) => void;
  onSetAll?: (categoryIds: string[]) => void;
}

function summaryText(active: Set<string>): string {
  if (active.size === 0) return 'Categories';
  if (active.size === CATEGORIES.length) return 'All categories';
  if (active.size === 1) {
    const cat = CATEGORIES.find((c) => active.has(c.id));
    return cat?.label ?? 'Categories';
  }
  if (active.size === 2) {
    return CATEGORIES.filter((c) => active.has(c.id)).map((c) => c.label).join(', ');
  }
  return `${active.size} categories`;
}

export function MapCategoryFilter({ activeCategories, onToggle, onSetAll }: Props) {
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: Event) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    if (expanded) {
      document.addEventListener('pointerdown', handleClick, true);
      document.addEventListener('mousedown', handleClick);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClick, true);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [expanded]);

  const hasActive = activeCategories.size > 0;
  const allActive = activeCategories.size === CATEGORIES.length;

  // Use the single category's icon when exactly one is selected
  const singleCatId = activeCategories.size === 1 ? [...activeCategories][0] : null;
  const singleCat = singleCatId ? CATEGORY_MAP[singleCatId] : null;
  const IconComponent = singleCat ? singleCat.icon : SlidersHorizontal;
  const iconColor = singleCat ? singleCat.color : undefined;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-1.5 h-8 px-2.5 rounded-full shadow-md border cursor-pointer transition-all"
        style={{
          background: hasActive ? '#fff' : '#fffbeb',
          borderColor: !hasActive ? '#f59e0b' : allActive ? '#e5e5e5' : '#333',
          color: hasActive ? '#333' : '#b45309',
          // Nothing selected means an empty map — call attention to the filter
          // rather than letting it read as "no places found"
          boxShadow: hasActive ? undefined : '0 0 0 3px rgba(245,158,11,0.35)',
        }}
      >
        <IconComponent className="h-3.5 w-3.5" style={iconColor ? { color: iconColor } : undefined} />
        <span className="text-[13px] font-medium whitespace-nowrap">{summaryText(activeCategories)}</span>
      </button>

      {expanded && (
        <div className="absolute left-0 mt-1.5 bg-white rounded-lg shadow-lg border border-border py-1 min-w-[180px] z-50">
          {/* All / None buttons */}
          {onSetAll && (
            <div className="flex gap-1 px-3 py-1.5 border-b border-border">
              <button
                onClick={() => onSetAll(CATEGORIES.map((c) => c.id))}
                className="text-xs font-medium px-2 py-0.5 rounded border cursor-pointer transition-colors"
                style={{
                  borderColor: allActive ? '#333' : '#ddd',
                  background: allActive ? '#f5f5f5' : '#fff',
                  color: '#555',
                }}
              >
                All
              </button>
              <button
                onClick={() => onSetAll([])}
                className="text-xs font-medium px-2 py-0.5 rounded border cursor-pointer transition-colors"
                style={{
                  borderColor: activeCategories.size === 0 ? '#333' : '#ddd',
                  background: activeCategories.size === 0 ? '#f5f5f5' : '#fff',
                  color: '#555',
                }}
              >
                None
              </button>
            </div>
          )}
          {CATEGORIES.map((cat) => {
            const active = activeCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => onToggle(cat.id)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer border-none bg-transparent"
              >
                <div
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: active ? cat.color : '#ccc',
                    background: active ? cat.color : 'transparent',
                  }}
                >
                  {active && <Check className="h-3 w-3 text-white" />}
                </div>
                <cat.icon className="h-3.5 w-3.5" style={{ color: active ? cat.color : '#aaa' }} />
                <span style={{ color: active ? '#333' : '#888' }}>{cat.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
