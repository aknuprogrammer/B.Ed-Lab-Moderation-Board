import React from 'react';
import { AlertTriangle, Info, CheckCircle2, X, RefreshCw } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info' | 'success'
  loading = false,
  isAlert = false, // If true, only shows OK button
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bgIcon: 'bg-red-100 text-red-600',
      icon: AlertTriangle,
      btn: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-2 focus:ring-red-500',
    },
    warning: {
      bgIcon: 'bg-amber-100 text-amber-600',
      icon: AlertTriangle,
      btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm focus:ring-2 focus:ring-amber-500',
    },
    info: {
      bgIcon: 'bg-teal-100 text-teal-700',
      icon: Info,
      btn: 'bg-teal-700 hover:bg-teal-800 text-white shadow-sm focus:ring-2 focus:ring-teal-500',
    },
    success: {
      bgIcon: 'bg-emerald-100 text-emerald-600',
      icon: CheckCircle2,
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm focus:ring-2 focus:ring-emerald-500',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.danger;
  const IconComponent = currentVariant.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 transform transition-all animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${currentVariant.bgIcon}`}>
              <IconComponent className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 leading-6">
                {title}
              </h3>
              {message && (
                <p className="mt-2 text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end space-x-3">
          {!isAlert && (
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onConfirm) onConfirm();
              if (isAlert) onClose();
            }}
            disabled={loading}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 ${currentVariant.btn}`}
          >
            {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            <span>{isAlert ? 'OK' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
