interface Props {
  view: 'map' | 'list';
  onChangeView: (view: 'map' | 'list') => void;
  onAdd: () => void;
}

const MapIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ListIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#111' : '#999'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);

const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export function BottomNav({ view, onChangeView, onAdd }: Props) {
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
    padding: '8px 0',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 10,
    fontWeight: active ? 600 : 400,
    color: active ? '#111' : '#999',
    letterSpacing: 0.3,
  });

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        zIndex: 900,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <button onClick={() => onChangeView('map')} style={tabStyle(view === 'map')}>
        <MapIcon active={view === 'map'} />
        <span>Map</span>
      </button>

      <button
        onClick={onAdd}
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          border: 'none',
          background: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
          marginTop: -12,
        }}
      >
        <PlusIcon />
      </button>

      <button onClick={() => onChangeView('list')} style={tabStyle(view === 'list')}>
        <ListIcon active={view === 'list'} />
        <span>List</span>
      </button>
    </nav>
  );
}
