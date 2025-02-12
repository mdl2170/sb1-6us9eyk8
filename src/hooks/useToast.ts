import { useToastStore } from '../stores/useToastStore';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
}

export function useToast() {
  const { addToast } = useToastStore();

  const showToast = ({ type, title, message, duration = 5000 }: ToastOptions) => {
    addToast({
      id: Date.now().toString(),
      type,
      title,
      message,
      duration,
    });
  };

  return { showToast };
}