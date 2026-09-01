import React, { useEffect } from 'react';
import { ToastMessage } from '../../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XIcon, ShieldExclamationIcon } from '../icons';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

/** Tối đa 3 toast cùng lúc, tự tắt sau 4s — vnext-ui/references/components.md */
const MAX_VISIBLE_TOASTS = 3;

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const accentClasses = {
    success: 'border-l-success text-success',
    error: 'border-l-destructive text-danger-text',
    info: 'border-l-primary text-vnext-deep dark:text-primary',
    warning: 'border-l-warning text-vnext-amber dark:text-warning',
  }[toast.type];

  const IconComponent = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: InformationCircleIcon,
    warning: ShieldExclamationIcon,
  }[toast.type];

  return (
    <div
      className={`flex items-start gap-3 p-4 mb-3 rounded-lg border border-border border-l-4 bg-card shadow-orange-lg animate-slide-in-right ${accentClasses}`}
      role="alert"
    >
      <IconComponent className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span className="text-sm font-medium text-foreground">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-auto -mr-1 -mt-1 inline-flex items-center justify-center w-7 h-7 flex-shrink-0 rounded-md text-muted-foreground transition-colors duration-150 ease-spring hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="Đóng thông báo"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>>;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, setToasts }) => {
  const dismissToast = (id: string) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  };

  if (!toasts.length) return null;

  return (
    <div className="fixed z-[90] w-full max-w-sm px-4 top-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-4 sm:translate-x-0 sm:px-0">
      {toasts.slice(-MAX_VISIBLE_TOASTS).map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
