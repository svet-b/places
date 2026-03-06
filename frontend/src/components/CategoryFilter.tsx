import { CATEGORIES } from '../constants';

interface Props {
  activeCategories: Set<string>;
  onToggle: (category: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  coffee: '#8B4513',
  restaurant: '#DC143C',
  bar: '#4B0082',
  bakery: '#D2691E',
  shop: '#2E8B57',
  park: '#228B22',
  culture: '#4169E1',
  other: '#708090',
};

export function CategoryFilter({ activeCategories, onToggle }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0', flexShrink: 0 }}>
      {CATEGORIES.map((cat) => {
        const active = activeCategories.has(cat);
        return (
          <button
            key={cat}
            onClick={() => onToggle(cat)}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: `1.5px solid ${CATEGORY_COLORS[cat]}`,
              background: active ? CATEGORY_COLORS[cat] : 'transparent',
              color: active ? '#fff' : CATEGORY_COLORS[cat],
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
            }}
          >
            {cat}
          </button>
        );
      })}
    </div>
  );
}
