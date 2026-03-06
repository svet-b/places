import { useEffect } from 'react';

interface Props {
  message: string;
  onDismiss: () => void;
}

export function Toast({ message, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed',
        bottom: 70,
        left: 16,
        right: 16,
        background: '#333',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: 10,
        fontSize: 14,
        zIndex: 2000,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      {message}
    </div>
  );
}
