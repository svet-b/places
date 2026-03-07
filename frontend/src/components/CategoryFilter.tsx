import { CATEGORIES } from '../constants';

interface Props {
  activeCategories: Set<string>;
  onToggle: (category: string) => void;
}

export function CategoryFilter({ activeCategories, onToggle }: Props) {
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0', flexShrink: 0 }}>
      {CATEGORIES.map((cat) => {
        const active = activeCategories.has(cat.id);
        return (
          <button
            key={cat.id}
            onClick={() => onToggle(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 20,
              border: `1.5px solid ${active ? cat.color : '#ddd'}`,
              background: active ? `${cat.color}18` : '#fff',
              color: active ? cat.color : '#888',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 14 }}>{cat.emoji}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
