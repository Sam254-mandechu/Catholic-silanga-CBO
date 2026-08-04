// Lightweight global toast manager — no extra deps
type ToastType = 'success' | 'error' | 'info' | 'warning';
type Subscriber = (toast: { id: number; message: string; type: ToastType }) => void;

let counter = 0;
const subscribers = new Set<Subscriber>();

export function subscribe(fn: Subscriber) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function fire(message: string, type: ToastType) {
  subscribers.forEach((fn) => fn({ id: ++counter, message, type }));
}

export const toast = {
  success: (m: string) => fire(m, 'success'),
  error: (m: string) => fire(m, 'error'),
  info: (m: string) => fire(m, 'info'),
  warning: (m: string) => fire(m, 'warning'),
};
