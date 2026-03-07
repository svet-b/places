import { CATEGORIES } from '../constants';
import { Clock, Loader2 } from 'lucide-react';

interface Props {
  activeCategories: Set<string>;
  onToggle: (category: string) => void;
  openNowFilter: boolean;
  openNowLoading: boolean;
  onToggleOpenNow: () => void;
}

export function CategoryFilter({ activeCategories, onToggle, openNowFilter, openNowLoading, onToggleOpenNow }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto py-2 px-4 shrink-0">
      {CATEGORIES.map((cat) => {
        const active = activeCategories.has(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all shrink-0 border-[1.5px]"
            style={{
              borderColor: active ? cat.color : '#ddd',
              background: active ? `${cat.color}18` : '#fff',
              color: active ? cat.color : '#888',
            }}
          >
            <cat.icon className="h-3.5 w-3.5" />
            {cat.label}
          </button>
        );
      })}
      <div className="w-px bg-border shrink-0 my-0.5" />
      <button
        onClick={onToggleOpenNow}
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all shrink-0 border-[1.5px]"
        style={{
          borderColor: openNowFilter ? '#16a34a' : '#ddd',
          background: openNowFilter ? '#16a34a18' : '#fff',
          color: openNowFilter ? '#16a34a' : '#888',
        }}
      >
        <Clock className="h-3.5 w-3.5" />
        Open now
        {openNowLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      </button>
    </div>
  );
}
