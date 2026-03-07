import { CATEGORIES } from '../constants';

interface Props {
  activeCategories: Set<string>;
  onToggle: (category: string) => void;
}

export function CategoryFilter({ activeCategories, onToggle }: Props) {
  return (
    <>
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
    </>
  );
}
