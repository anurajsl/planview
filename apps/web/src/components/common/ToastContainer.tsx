import { useToastStore, ToastType } from '../../stores/toast.store';

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#166534' },
  error: { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#92400e' },
  info: { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1e40af' },
};

export default function ToastContainer() {
  const { toasts, remove } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 380,
      }}
    >
      {toasts.map((toast, i) => {
        const c = COLORS[toast.type];
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 10,
              background: c.bg,
              border: `1px solid ${c.border}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.06)',
              animation: 'toastSlideIn 0.25s ease',
              fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          >
            <style>{`
              @keyframes toastSlideIn {
                from { transform: translateX(40px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
              }
            `}</style>

            {/* Icon */}
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                background: c.icon,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
                marginTop: 1,
              }}
            >
              {ICONS[toast.type]}
            </div>

            {/* Message */}
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: c.text,
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {toast.message}
            </span>

            {/* Close */}
            <button
              onClick={() => remove(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: c.text + '80',
                cursor: 'pointer',
                fontSize: 14,
                padding: 0,
                marginTop: 1,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
