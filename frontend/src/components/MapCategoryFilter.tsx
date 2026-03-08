import { useState, useRef, useEffect } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, CATEGORY_MAP } from '../constants';

interface Props {
  activeCategories: Set<string>;
  onToggle: (category: string) => void;
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

export function MapCategoryFilter({ activeCategories, onToggle }: Props) {
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
          background: '#fff',
          borderColor: hasActive ? '#333' : '#e5e5e5',
          color: hasActive ? '#333' : '#666',
        }}
      >
        <IconComponent className="h-3.5 w-3.5" style={iconColor ? { color: iconColor } : undefined} />
        <span className="text-[13px] font-medium whitespace-nowrap">{summaryText(activeCategories)}</span>
      </button>

      {expanded && (
        <div
          className="fixed mt-1.5 bg-white rounded-lg shadow-lg border border-border py-2 overflow-x-auto"
          style={{ left: '12px', right: '12px', top: ref.current?.getBoundingClientRect().bottom ?? 0 }}
        >
          <div className="flex gap-1.5 px-2">
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
        </div>
      )}
    </div>
  );
}
