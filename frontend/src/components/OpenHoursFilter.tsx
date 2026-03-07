import { useState, useRef, useEffect } from 'react';
import { Clock, X, Loader2 } from 'lucide-react';
import { HoursPeriod } from '../api/client';

export type HoursFilterMode = 'off' | 'now' | 'at';

interface Props {
  mode: HoursFilterMode;
  onChangeMode: (mode: HoursFilterMode) => void;
  selectedDateTime: Date | null;
  onChangeDateTime: (dt: Date) => void;
  loading: boolean;
  variant?: 'floating' | 'inline';
}

function formatDateTime(dt: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const day = days[dt.getDay()];
  const h = dt.getHours();
  const m = dt.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const mStr = m.toString().padStart(2, '0');
  return `${day} ${h12}:${mStr} ${ampm}`;
}

function toLocalInputValue(dt: Date): string {
  const y = dt.getFullYear();
  const mo = (dt.getMonth() + 1).toString().padStart(2, '0');
  const d = dt.getDate().toString().padStart(2, '0');
  const h = dt.getHours().toString().padStart(2, '0');
  const mi = dt.getMinutes().toString().padStart(2, '0');
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

export function isOpenAtTime(periods: HoursPeriod[], date: Date): boolean {
  const day = date.getDay();
  const timeMinutes = date.getHours() * 60 + date.getMinutes();

  for (const period of periods) {
    const openMin = period.open.hour * 60 + period.open.minute;
    const closeMin = period.close.hour * 60 + period.close.minute;

    if (period.open.day === period.close.day) {
      if (day === period.open.day && timeMinutes >= openMin && timeMinutes < closeMin) {
        return true;
      }
    } else {
      if (day === period.open.day && timeMinutes >= openMin) return true;
      if (day === period.close.day && timeMinutes < closeMin) return true;
      const openDay = period.open.day;
      const closeDay = period.close.day;
      const span = closeDay > openDay ? closeDay - openDay : 7 - openDay + closeDay;
      if (span > 1) {
        for (let d = 1; d < span; d++) {
          if ((openDay + d) % 7 === day) return true;
        }
      }
    }
  }
  return false;
}

export function OpenHoursFilter({ mode, onChangeMode, selectedDateTime, onChangeDateTime, loading, variant = 'floating' }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setExpanded(false);
        setShowPicker(false);
      }
    }
    if (expanded || showPicker) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded, showPicker]);

  const isActive = mode !== 'off';
  const isFloating = variant === 'floating';

  // Shared pill styling — consistent height for both variants
  const pillStyle = {
    background: isActive ? '#f0fdf4' : '#fff',
    borderColor: isActive ? '#16a34a' : '#e5e5e5',
  };

  const labelText = mode === 'now'
    ? 'Open now'
    : mode === 'at' && selectedDateTime
      ? formatDateTime(selectedDateTime)
      : 'Hours';

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Main pill */}
      {!showPicker && (
        <div
          className={`flex items-center h-8 rounded-full border transition-all overflow-hidden ${isFloating ? 'shadow-md' : ''}`}
          style={pillStyle}
        >
          <button
            onClick={() => {
              if (isActive) {
                onChangeMode('off');
                setExpanded(false);
              } else {
                setExpanded((prev) => !prev);
              }
            }}
            className="flex items-center gap-1.5 h-full px-2.5 cursor-pointer shrink-0"
            style={{ color: isActive ? '#16a34a' : '#666' }}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Clock className="h-3.5 w-3.5" />
            )}
            {mode === 'at' && selectedDateTime ? (
              <span
                className="text-[13px] font-medium underline decoration-dotted"
                onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}
              >
                {labelText}
              </span>
            ) : (
              <span className="text-[13px] font-medium">{labelText}</span>
            )}
            {isActive && <X className="h-3 w-3 ml-0.5" />}
          </button>

          {expanded && !isActive && (
            <div className="flex items-center gap-0.5 pr-1.5">
              <button
                onClick={() => {
                  onChangeMode('now');
                  setExpanded(false);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
              >
                Now
              </button>
              <span className="text-gray-300 text-xs">|</span>
              <button
                onClick={() => {
                  const dt = new Date();
                  dt.setMinutes(0, 0, 0);
                  dt.setHours(dt.getHours() + 1);
                  onChangeDateTime(dt);
                  setExpanded(false);
                  setShowPicker(true);
                }}
                className="px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap text-gray-500 hover:bg-gray-100 hover:text-green-600 transition-colors"
              >
                Pick time...
              </button>
            </div>
          )}
        </div>
      )}

      {/* DateTime picker */}
      {showPicker && (
        <div className={`bg-white rounded-lg shadow-md border border-border p-2.5 flex flex-col gap-2 ${isFloating ? 'absolute top-0 left-0 z-10' : ''}`}>
          <div className="text-xs font-medium text-muted-foreground">Open at:</div>
          <input
            type="datetime-local"
            autoFocus
            value={selectedDateTime ? toLocalInputValue(selectedDateTime) : ''}
            onChange={(e) => {
              if (e.target.value) onChangeDateTime(new Date(e.target.value));
            }}
            className="text-sm border border-border rounded px-2 py-1.5 w-full"
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowPicker(false)}
              className="flex-1 px-2 py-1 rounded text-xs font-medium border border-border text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onChangeMode('at');
                setShowPicker(false);
              }}
              className="flex-1 px-2 py-1 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
