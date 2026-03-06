interface Props {
  view: 'map' | 'list';
  onChangeView: (view: 'map' | 'list') => void;
}

export function BottomNav({ view, onChangeView }: Props) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        background: '#fff',
        borderTop: '1px solid #e0e0e0',
        zIndex: 900,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <button
        onClick={() => onChangeView('map')}
        style={{
          flex: 1,
          padding: '12px 0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: view === 'map' ? 700 : 400,
          color: view === 'map' ? '#111' : '#999',
        }}
      >
        Map
      </button>
      <button
        onClick={() => onChangeView('list')}
        style={{
          flex: 1,
          padding: '12px 0',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: view === 'list' ? 700 : 400,
          color: view === 'list' ? '#111' : '#999',
        }}
      >
        List
      </button>
    </nav>
  );
}
