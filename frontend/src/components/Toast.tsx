import { useEffect } from 'react';
import { X } from 'lucide-react';

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
      className="fixed bottom-18 left-4 right-4 bg-foreground text-background px-4 py-3 rounded-xl text-sm z-[2000] cursor-pointer shadow-lg flex items-center justify-between gap-2"
    >
      {message}
      <X className="h-4 w-4 shrink-0 opacity-70" />
    </div>
  );
}
