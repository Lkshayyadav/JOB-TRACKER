import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 3.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Floating Toasts Wrapper */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />,
            error: <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />,
            info: <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />,
          };

          const cardStyles = {
            success: 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 backdrop-blur-md shadow-emerald-500/5',
            error: 'border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20 backdrop-blur-md shadow-rose-500/5',
            info: 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20 backdrop-blur-md shadow-blue-500/5',
          };

          return (
            <div
              key={toast.id}
              className={`flex items-start justify-between gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 pointer-events-auto transform translate-y-0 animate-slide-in ${cardStyles[toast.type]}`}
            >
              <div className="flex gap-3 items-center">
                {icons[toast.type]}
                <p className="text-sm font-medium text-foreground">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-muted-foreground/80 hover:text-foreground hover:bg-secondary/40 p-1 rounded transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
