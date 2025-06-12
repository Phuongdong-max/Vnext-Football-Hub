
import React, { useEffect } from 'react';
import { ToastMessage } from '../../types';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XIcon } from '../icons';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000); // Auto dismiss after 5 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [toast.id, onDismiss]);

  const baseClasses = "flex items-center p-4 mb-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ease-in-out";
  const typeClasses = {
    success: "bg-green-500 text-white",
    error: "bg-danger text-white",
    info: "bg-blue-500 text-white",
  };

  const IconComponent = {
    success: CheckCircleIcon,
    error: XCircleIcon,
    info: InformationCircleIcon,
  }[toast.type];

  return (
    <div 
        className={`${baseClasses} ${typeClasses[toast.type]} opacity-0 animate-toastIn`}
        role="alert"
    >
      <IconComponent className="w-5 h-5 mr-3" />
      <span>{toast.message}</span>
      <button 
        onClick={() => onDismiss(toast.id)} 
        className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss"
      >
        <XIcon className="w-4 h-4" />
      </button>
      <style jsx-global>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-toastIn { animation: toastIn 0.3s forwards; }
      `}</style>
    </div>
  );
};


interface ToastContainerProps {
  toasts: ToastMessage[];
  setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>>;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, setToasts }) => {
  const dismissToast = (id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  };

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[200] w-full max-w-xs sm:max-w-sm">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
    