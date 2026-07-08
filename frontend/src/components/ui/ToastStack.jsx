import React from 'react';
import { X } from 'lucide-react';

const ToastStack = ({ toasts, onDismiss }) => (
  <div className="fixed right-4 top-20 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
    {toasts.map((toast) => (
      <div key={toast.id} className={`rounded-xl border p-4 shadow-xl backdrop-blur ${toast.type === 'error' ? 'border-red-700 bg-red-950/90 text-red-100' : 'border-slate-700 bg-slate-900/90 text-slate-100'}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold">{toast.title}</div>
            {toast.message && <div className="mt-1 text-sm text-slate-300">{toast.message}</div>}
          </div>
          <button type="button" onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-white" aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      </div>
    ))}
  </div>
);

export default ToastStack;
