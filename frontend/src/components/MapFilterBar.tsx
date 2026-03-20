import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { PriorityDropdown } from './PriorityDropdown';

interface Props {
  activePriorities: Set<number>;
  onTogglePriority: (priority: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function MapFilterBar({ activePriorities, onTogglePriority, search, onSearchChange }: Props) {
  const [searchOpen, setSearchOpen] = useState(!!search);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  return (
    <>
      {/* Priority dropdown */}
      <PriorityDropdown activePriorities={activePriorities} onTogglePriority={onTogglePriority} />

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
    </>
  );
}
