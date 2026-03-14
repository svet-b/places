import { MapPin, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface Props {
  view: 'map' | 'list';
  onChangeView: (view: 'map' | 'list') => void;
  onAdd: () => void;
  trailing?: ReactNode;
}

export function BottomNav({ view, onChangeView, onAdd, trailing }: Props) {
  return (
    <nav
      className="fixed left-0 right-0 flex items-center justify-center gap-2 z-[900] pointer-events-none"
      style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex items-center gap-1 bg-background/90 backdrop-blur-md rounded-full shadow-lg border border-border/50 px-2 py-1.5 pointer-events-auto">
        <button
          onClick={() => onChangeView('map')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-full border-none bg-transparent cursor-pointer transition-colors',
            view === 'map' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <MapPin className="h-[20px] w-[20px]" />
          <span className="text-[10px] font-medium tracking-wide">Map</span>
        </button>

        <button
          onClick={onAdd}
          className="w-9 h-9 rounded-full border-none bg-foreground text-background flex items-center justify-center cursor-pointer shadow-sm mx-1"
        >
          <Plus className="h-[18px] w-[18px]" strokeWidth={2.5} />
        </button>

        <button
          onClick={() => onChangeView('list')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-full border-none bg-transparent cursor-pointer transition-colors',
            view === 'list' ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <List className="h-[20px] w-[20px]" />
          <span className="text-[10px] font-medium tracking-wide">List</span>
        </button>
      </div>
      {trailing && <div className="pointer-events-auto absolute right-3">{trailing}</div>}
    </nav>
  );
}
