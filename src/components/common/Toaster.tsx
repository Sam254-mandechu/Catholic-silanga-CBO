import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { subscribe } from '../../utils/toast';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const styleMap: Record<ToastType, { icon: ReactNode; color: string }> = {
  success: { icon: <CheckCircle2 className="w-5 h-5" />, color: 'bg-green-700 text-white' },
  error: { icon: <AlertCircle className="w-5 h-5" />, color: 'bg-destructive text-destructive-foreground' },
  info: { icon: <Info className="w-5 h-5" />, color: 'bg-primary text-primary-foreground' },
  warning: { icon: <AlertTriangle className="w-5 h-5" />, color: 'bg-gold-500 text-white' },
};

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const unsub = subscribe((t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id));
      }, 4500);
    });
    return () => {
      unsub();
    };
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] space-y-2 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`pointer-events-auto rounded-lg shadow-lg ${styleMap[t.type].color} px-4 py-3 flex items-center gap-3`}
          >
            {styleMap[t.type].icon}
            <p className="flex-1 text-sm font-medium">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              className="hover:opacity-80"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
