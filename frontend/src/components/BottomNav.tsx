import { MapPin, List, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  view: 'map' | 'list';
  onChangeView: (view: 'map' | 'list') => void;
  onAdd: () => void;
}

export function BottomNav({ view, onChangeView, onAdd }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around bg-background border-t border-border z-[900] pb-[env(safe-area-inset-bottom)]">
      <button
        onClick={() => onChangeView('map')}
        className={cn(
          'flex-1 flex flex-col items-center gap-0.5 py-2 border-none bg-transparent cursor-pointer transition-colors',
          view === 'map' ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <MapPin className="h-[22px] w-[22px]" />
        <span className="text-[10px] font-medium tracking-wide">{view === 'map' ? 'Map' : 'Map'}</span>
      </button>

      <button
        onClick={onAdd}
        className="w-12 h-12 rounded-[14px] border-none bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-lg -mt-3"
      >
        <Plus className="h-[22px] w-[22px]" strokeWidth={2.5} />
      </button>

      <button
        onClick={() => onChangeView('list')}
        className={cn(
          'flex-1 flex flex-col items-center gap-0.5 py-2 border-none bg-transparent cursor-pointer transition-colors',
          view === 'list' ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        <List className="h-[22px] w-[22px]" />
        <span className="text-[10px] font-medium tracking-wide">List</span>
      </button>
    </nav>
  );
}
